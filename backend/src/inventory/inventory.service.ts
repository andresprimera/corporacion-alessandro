import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import {
  InventoryTransaction,
  InventoryTransactionDocument,
} from './schemas/inventory-transaction.schema';
import { ProductDocument } from '../products/schemas/product.schema';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { readPopulatedRef } from '../common/utils/populated-ref';
import type {
  AggregatedCityStockEntry,
  CreateInventoryTransactionInput,
  InventoryTransactionCreatedBy,
  PaginationQuery,
  ProductStockAggregated,
  ProductStockByWarehouse,
  StockByWarehouseQuery,
  UpdateInventoryTransactionInput,
} from '@base-dashboard/shared';

interface StockFacetResult<T> {
  data: T[];
  total: { count: number }[];
}

const signedQtySum = {
  $sum: {
    $cond: [
      { $eq: ['$transactionType', 'outbound'] },
      { $multiply: ['$qty', -1] },
      '$qty',
    ],
  },
};

interface ConvertedQty {
  qty: number;
  enteredQty: number;
  enteredUnitId: Types.ObjectId;
  unitsPerPackageAtEntry?: number;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private inventoryModel: Model<InventoryTransaction>,
    private productsService: ProductsService,
    @Inject(forwardRef(() => WarehousesService))
    private warehousesService: WarehousesService,
  ) {}

  private async loadProduct(productId: string): Promise<ProductDocument> {
    const product = await this.productsService.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async assertActiveWarehouse(warehouseId: string): Promise<void> {
    const warehouse = await this.warehousesService.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    if (!warehouse.isActive) {
      throw new BadRequestException('Warehouse is inactive');
    }
  }

  private convertEnteredQty(
    product: ProductDocument,
    enteredQty: number,
    enteredUnitId: string | undefined,
  ): ConvertedQty {
    const basicId = readPopulatedRef(product.basicUnitId).id;
    const packageId = product.packageUnitId
      ? readPopulatedRef(product.packageUnitId).id
      : undefined;

    const resolvedId = enteredUnitId ?? basicId;

    if (resolvedId === basicId) {
      return {
        qty: enteredQty,
        enteredQty,
        enteredUnitId: new Types.ObjectId(resolvedId),
      };
    }

    if (packageId && resolvedId === packageId) {
      if (!product.unitsPerPackage) {
        throw new BadRequestException(
          'Product has a package unit but no units per package',
        );
      }
      return {
        qty: enteredQty * product.unitsPerPackage,
        enteredQty,
        enteredUnitId: new Types.ObjectId(resolvedId),
        unitsPerPackageAtEntry: product.unitsPerPackage,
      };
    }

    throw new BadRequestException(
      'Entered unit does not belong to this product',
    );
  }

  async create(
    data: CreateInventoryTransactionInput,
    createdBy: InventoryTransactionCreatedBy,
    opts: { skipValidation?: boolean } = {},
  ): Promise<InventoryTransactionDocument> {
    const [product] = await Promise.all([
      this.loadProduct(data.productId),
      opts.skipValidation
        ? Promise.resolve()
        : this.assertActiveWarehouse(data.warehouseId),
    ]);

    const converted = this.convertEnteredQty(
      product,
      data.qty,
      data.enteredUnitId,
    );

    const created = await this.inventoryModel.create({
      productId: new Types.ObjectId(data.productId),
      warehouseId: new Types.ObjectId(data.warehouseId),
      transactionType: data.transactionType,
      batch: data.batch,
      qty: converted.qty,
      notes: data.notes,
      expirationDate: data.expirationDate
        ? new Date(data.expirationDate)
        : undefined,
      enteredQty: converted.enteredQty,
      enteredUnitId: converted.enteredUnitId,
      unitsPerPackageAtEntry: converted.unitsPerPackageAtEntry,
      createdBy,
    });
    await created.populate([
      { path: 'productId', select: 'name kind' },
      { path: 'warehouseId', select: 'name' },
      { path: 'enteredUnitId', select: 'name abbreviation' },
    ]);
    return created;
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{ data: InventoryTransactionDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.inventoryModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('productId', 'name kind')
        .populate('warehouseId', 'name')
        .populate('enteredUnitId', 'name abbreviation'),
      this.inventoryModel.countDocuments(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<InventoryTransactionDocument | null> {
    return this.inventoryModel
      .findById(id)
      .populate('productId', 'name kind')
      .populate('warehouseId', 'name')
      .populate('enteredUnitId', 'name abbreviation');
  }

  async update(
    id: string,
    data: UpdateInventoryTransactionInput,
  ): Promise<InventoryTransactionDocument | null> {
    if (data.warehouseId) {
      await this.assertActiveWarehouse(data.warehouseId);
    }

    const existing = await this.inventoryModel.findById(id);
    if (!existing) {
      return null;
    }

    if (data.productId) {
      await this.loadProduct(data.productId);
    }

    const update: Partial<InventoryTransaction> & {
      qty?: number;
      enteredQty?: number;
      enteredUnitId?: Types.ObjectId;
      unitsPerPackageAtEntry?: number;
    } = {};
    if (data.transactionType !== undefined) {
      update.transactionType = data.transactionType;
    }
    if (data.batch !== undefined) {
      update.batch = data.batch;
    }
    if (data.notes !== undefined) {
      update.notes = data.notes;
    }
    if (data.productId !== undefined) {
      update.productId = new Types.ObjectId(data.productId);
    }
    if (data.warehouseId !== undefined) {
      update.warehouseId = new Types.ObjectId(data.warehouseId);
    }
    if (data.expirationDate !== undefined) {
      update.expirationDate = data.expirationDate
        ? new Date(data.expirationDate)
        : undefined;
    }

    const qtyChanged = data.qty !== undefined;
    const unitChanged = data.enteredUnitId !== undefined;
    if (qtyChanged || unitChanged) {
      const productIdForConversion =
        data.productId ?? readPopulatedRef(existing.productId).id;
      const product = await this.loadProduct(productIdForConversion);
      const enteredQty = data.qty ?? existing.enteredQty ?? existing.qty;
      const existingUnitId = existing.enteredUnitId
        ? readPopulatedRef(existing.enteredUnitId).id
        : undefined;
      const enteredUnitId = data.enteredUnitId ?? existingUnitId;
      const converted = this.convertEnteredQty(
        product,
        enteredQty,
        enteredUnitId,
      );
      const mergedType = (data.transactionType ??
        existing.transactionType) as
        | 'inbound'
        | 'outbound'
        | 'adjustment';
      if (converted.qty === 0) {
        throw new BadRequestException('Quantity must not be zero');
      }
      if (
        (mergedType === 'inbound' || mergedType === 'outbound') &&
        converted.qty < 0
      ) {
        throw new BadRequestException(
          'Quantity must be positive for inbound and outbound transactions',
        );
      }
      update.qty = converted.qty;
      update.enteredQty = converted.enteredQty;
      update.enteredUnitId = converted.enteredUnitId;
      update.unitsPerPackageAtEntry = converted.unitsPerPackageAtEntry;
    }

    return this.inventoryModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('productId', 'name kind')
      .populate('warehouseId', 'name')
      .populate('enteredUnitId', 'name abbreviation');
  }

  async remove(id: string): Promise<void> {
    await this.inventoryModel.findByIdAndDelete(id);
  }

  async existsByWarehouse(warehouseId: string): Promise<boolean> {
    const result = await this.inventoryModel.exists({ warehouseId });
    return result !== null;
  }

  async findAvailableStock(
    productId: string,
    warehouseId: string,
  ): Promise<number> {
    const [result] = await this.inventoryModel.aggregate<{ totalQty: number }>([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          warehouseId: new Types.ObjectId(warehouseId),
        },
      },
      {
        $group: {
          _id: null,
          totalQty: signedQtySum,
        },
      },
    ]);
    return result?.totalQty ?? 0;
  }

  async findCityStockForProduct(
    productId: string,
    cityId: string,
  ): Promise<number> {
    const warehouses = await this.warehousesService.findActiveByCity(cityId);
    if (warehouses.length === 0) return 0;
    const warehouseIds = warehouses.map(
      (w) => new Types.ObjectId(w.id as string),
    );

    const [result] = await this.inventoryModel.aggregate<{ totalQty: number }>([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          warehouseId: { $in: warehouseIds },
        },
      },
      {
        $group: {
          _id: null,
          totalQty: signedQtySum,
        },
      },
    ]);
    return result?.totalQty ?? 0;
  }

  async findAggregatedCityStock(
    cityId: string,
  ): Promise<AggregatedCityStockEntry[]> {
    const warehouses = await this.warehousesService.findActiveByCity(cityId);
    if (warehouses.length === 0) return [];
    const warehouseIds = warehouses.map(
      (w) => new Types.ObjectId(w.id as string),
    );

    return this.inventoryModel.aggregate<AggregatedCityStockEntry>([
      { $match: { warehouseId: { $in: warehouseIds } } },
      {
        $group: {
          _id: '$productId',
          totalQty: signedQtySum,
        },
      },
      {
        $project: {
          _id: 0,
          productId: { $toString: '$_id' },
          totalQty: 1,
        },
      },
    ]);
  }

  async findStockByWarehouse(
    query: StockByWarehouseQuery,
  ): Promise<{ data: ProductStockByWarehouse[]; total: number }> {
    const skip = (query.page - 1) * query.limit;
    const matchFilter: Record<string, Types.ObjectId> = {};
    if (query.warehouseId) {
      matchFilter.warehouseId = new Types.ObjectId(query.warehouseId);
    }
    if (query.productId) {
      matchFilter.productId = new Types.ObjectId(query.productId);
    }
    const matchStage: PipelineStage[] =
      Object.keys(matchFilter).length > 0
        ? [{ $match: matchFilter }]
        : [];

    const pipeline: PipelineStage[] = [
      ...matchStage,
      {
        $group: {
          _id: { productId: '$productId', warehouseId: '$warehouseId' },
          totalQty: signedQtySum,
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id.warehouseId',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      { $unwind: '$product' },
      { $unwind: '$warehouse' },
      {
        $project: {
          _id: 0,
          productId: { $toString: '$_id.productId' },
          productName: '$product.name',
          productKind: '$product.kind',
          warehouseId: { $toString: '$_id.warehouseId' },
          warehouseName: '$warehouse.name',
          totalQty: 1,
        },
      },
      { $sort: { productName: 1, warehouseName: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: query.limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await this.inventoryModel.aggregate<
      StockFacetResult<ProductStockByWarehouse>
    >(pipeline);

    return {
      data: result?.data ?? [],
      total: result?.total[0]?.count ?? 0,
    };
  }

  async findStockAggregated(
    query: PaginationQuery,
  ): Promise<{ data: ProductStockAggregated[]; total: number }> {
    const skip = (query.page - 1) * query.limit;

    const pipeline: PipelineStage[] = [
      {
        $group: {
          _id: '$productId',
          totalQty: signedQtySum,
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 0,
          productId: { $toString: '$_id' },
          productName: '$product.name',
          productKind: '$product.kind',
          totalQty: 1,
        },
      },
      { $sort: { productName: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: query.limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await this.inventoryModel.aggregate<
      StockFacetResult<ProductStockAggregated>
    >(pipeline);

    return {
      data: result?.data ?? [],
      total: result?.total[0]?.count ?? 0,
    };
  }
}
