import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sale.schema';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { InventoryService } from '../inventory/inventory.service';
import { isDuplicateKeyError } from '../common/utils/mongo-errors';
import type {
  CreateSaleInput,
  SaleSoldBy,
  UpdateSaleInput,
} from '@base-dashboard/shared';

interface ResolvedAllocation {
  warehouseId: string;
  warehouseName: string;
  qty: number;
}

interface ResolvedItem {
  productId: string;
  productName: string;
  productKind: string;
  requestedQty: number;
  unitPrice: number;
  currency: string;
  allocations: ResolvedAllocation[];
}

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectModel(Sale.name) private saleModel: Model<Sale>,
    private productsService: ProductsService,
    private warehousesService: WarehousesService,
    private inventoryService: InventoryService,
  ) {}

  async create(
    dto: CreateSaleInput,
    soldBy: SaleSoldBy,
  ): Promise<SaleDocument> {
    const resolvedItems = await this.resolveAndValidateItems(dto);

    const totalQty = resolvedItems.reduce(
      (sum, item) => sum + item.requestedQty,
      0,
    );
    const totalAmount = resolvedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.requestedQty,
      0,
    );
    const currency = resolvedItems[0]?.currency ?? 'USD';

    // Persist the sale first (with retry on the unique saleNumber index)
    // so that a race for the same number can't double-deduct inventory.
    const created = await this.persistSale(
      resolvedItems,
      totalQty,
      totalAmount,
      currency,
      soldBy,
      dto,
    );

    const batch = `SALE-${created.saleNumber}`;
    for (const item of resolvedItems) {
      for (const allocation of item.allocations) {
        await this.inventoryService.create(
          {
            productId: item.productId,
            warehouseId: allocation.warehouseId,
            transactionType: 'outbound',
            batch,
            qty: allocation.qty,
            notes: `Sale ${created.saleNumber}`,
          },
          { userId: soldBy.userId, name: soldBy.name },
          { skipValidation: true },
        );
      }
    }

    this.logger.log(
      `Sale ${created.saleNumber} created by ${soldBy.name} (${totalQty} units, ${totalAmount} ${currency})`,
    );
    return created;
  }

  private async persistSale(
    resolvedItems: ResolvedItem[],
    totalQty: number,
    totalAmount: number,
    currency: string,
    soldBy: SaleSoldBy,
    dto: CreateSaleInput,
    retriesLeft = 3,
  ): Promise<SaleDocument> {
    const saleNumber = await this.generateSaleNumber();
    try {
      return await this.saleModel.create({
        saleNumber,
        customerName: dto.customerName,
        notes: dto.notes,
        items: resolvedItems.map((item) => ({
          productId: new Types.ObjectId(item.productId),
          productName: item.productName,
          productKind: item.productKind,
          requestedQty: item.requestedQty,
          unitPrice: item.unitPrice,
          currency: item.currency,
          allocations: item.allocations.map((a) => ({
            warehouseId: new Types.ObjectId(a.warehouseId),
            warehouseName: a.warehouseName,
            qty: a.qty,
          })),
        })),
        totalQty,
        totalAmount,
        currency,
        soldBy,
      });
    } catch (err) {
      if (isDuplicateKeyError(err) && retriesLeft > 0) {
        return this.persistSale(
          resolvedItems,
          totalQty,
          totalAmount,
          currency,
          soldBy,
          dto,
          retriesLeft - 1,
        );
      }
      throw err;
    }
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{ data: SaleDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.saleModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.saleModel.countDocuments(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<SaleDocument | null> {
    return this.saleModel.findById(id);
  }

  async update(
    id: string,
    dto: UpdateSaleInput,
  ): Promise<SaleDocument | null> {
    return this.saleModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async remove(id: string): Promise<void> {
    const sale = await this.saleModel.findById(id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    const reversalBatch = `SALE-REVERSAL-${sale.saleNumber}`;
    for (const item of sale.items) {
      for (const allocation of item.allocations) {
        await this.inventoryService.create(
          {
            productId: item.productId.toString(),
            warehouseId: allocation.warehouseId.toString(),
            transactionType: 'inbound',
            batch: reversalBatch,
            qty: allocation.qty,
            notes: `Reversal of sale ${sale.saleNumber}`,
          },
          { userId: sale.soldBy.userId, name: sale.soldBy.name },
          { skipValidation: true },
        );
      }
    }

    await this.saleModel.findByIdAndDelete(id);
    this.logger.log(`Sale ${sale.saleNumber} reversed and deleted`);
  }

  private async resolveAndValidateItems(
    dto: CreateSaleInput,
  ): Promise<ResolvedItem[]> {
    const resolved: ResolvedItem[] = [];
    for (const item of dto.items) {
      const product = await this.productsService.findById(item.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }

      const allocations: ResolvedAllocation[] = [];
      for (const allocation of item.allocations) {
        const warehouse = await this.warehousesService.findById(
          allocation.warehouseId,
        );
        if (!warehouse) {
          throw new NotFoundException(
            `Warehouse not found: ${allocation.warehouseId}`,
          );
        }
        if (!warehouse.isActive) {
          throw new BadRequestException(
            `Warehouse is inactive: ${warehouse.name}`,
          );
        }
        allocations.push({
          warehouseId: allocation.warehouseId,
          warehouseName: warehouse.name,
          qty: allocation.qty,
        });
      }

      resolved.push({
        productId: item.productId,
        productName: product.name,
        productKind: product.kind,
        requestedQty: item.requestedQty,
        unitPrice: item.unitPrice,
        currency: product.price.currency,
        allocations,
      });
    }

    await this.assertSufficientStock(resolved);
    return resolved;
  }

  private async assertSufficientStock(items: ResolvedItem[]): Promise<void> {
    // Aggregate requested quantity by (productId, warehouseId) so a single
    // item with two allocations to the same warehouse — or multiple items
    // hitting the same (productId, warehouseId) — gets validated against
    // available stock once, not per-allocation.
    const requested = new Map<
      string,
      { productId: string; productName: string; warehouseId: string; warehouseName: string; qty: number }
    >();
    for (const item of items) {
      for (const allocation of item.allocations) {
        const key = `${item.productId}::${allocation.warehouseId}`;
        const existing = requested.get(key);
        if (existing) {
          existing.qty += allocation.qty;
        } else {
          requested.set(key, {
            productId: item.productId,
            productName: item.productName,
            warehouseId: allocation.warehouseId,
            warehouseName: allocation.warehouseName,
            qty: allocation.qty,
          });
        }
      }
    }

    for (const entry of requested.values()) {
      const available = await this.inventoryService.findAvailableStock(
        entry.productId,
        entry.warehouseId,
      );
      if (entry.qty > available) {
        throw new BadRequestException(
          `Insufficient stock for "${entry.productName}" at "${entry.warehouseName}" (requested ${entry.qty}, available ${available})`,
        );
      }
    }
  }

  private async generateSaleNumber(): Promise<string> {
    const year = new Date().getUTCFullYear();
    const yearPrefix = `S-${year}-`;
    const lastInYear = await this.saleModel
      .findOne({ saleNumber: { $regex: `^${yearPrefix}` } })
      .sort({ saleNumber: -1 })
      .select('saleNumber');
    const lastSeq = lastInYear
      ? parseInt(lastInYear.saleNumber.slice(yearPrefix.length), 10)
      : 0;
    const nextSeq = lastSeq + 1;
    return `${yearPrefix}${String(nextSeq).padStart(5, '0')}`;
  }
}
