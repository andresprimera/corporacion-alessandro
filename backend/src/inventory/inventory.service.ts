import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import {
  InventoryTransaction,
  InventoryTransactionDocument,
} from './schemas/inventory-transaction.schema';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import type {
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

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private inventoryModel: Model<InventoryTransaction>,
    private productsService: ProductsService,
    private warehousesService: WarehousesService,
  ) {}

  private async assertProduct(productId: string): Promise<void> {
    const product = await this.productsService.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
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

  async create(
    data: CreateInventoryTransactionInput,
    createdBy: InventoryTransactionCreatedBy,
    opts: { skipValidation?: boolean } = {},
  ): Promise<InventoryTransactionDocument> {
    if (!opts.skipValidation) {
      await Promise.all([
        this.assertProduct(data.productId),
        this.assertActiveWarehouse(data.warehouseId),
      ]);
    }
    const created = await this.inventoryModel.create({
      ...data,
      productId: new Types.ObjectId(data.productId),
      warehouseId: new Types.ObjectId(data.warehouseId),
      expirationDate: data.expirationDate
        ? new Date(data.expirationDate)
        : undefined,
      createdBy,
    });
    await created.populate([
      { path: 'productId', select: 'name kind' },
      { path: 'warehouseId', select: 'name' },
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
        .populate('warehouseId', 'name'),
      this.inventoryModel.countDocuments(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<InventoryTransactionDocument | null> {
    return this.inventoryModel
      .findById(id)
      .populate('productId', 'name kind')
      .populate('warehouseId', 'name');
  }

  async update(
    id: string,
    data: UpdateInventoryTransactionInput,
  ): Promise<InventoryTransactionDocument | null> {
    if (data.productId) {
      await this.assertProduct(data.productId);
    }
    if (data.warehouseId) {
      await this.assertActiveWarehouse(data.warehouseId);
    }
    if (data.qty !== undefined || data.transactionType !== undefined) {
      const existing = await this.inventoryModel.findById(id);
      if (!existing) {
        return null;
      }
      const mergedType = (data.transactionType ??
        existing.transactionType) as
        | 'inbound'
        | 'outbound'
        | 'adjustment';
      const mergedQty = data.qty ?? existing.qty;
      if (mergedQty === 0) {
        throw new BadRequestException('Quantity must not be zero');
      }
      if (
        (mergedType === 'inbound' || mergedType === 'outbound') &&
        mergedQty < 0
      ) {
        throw new BadRequestException(
          'Quantity must be positive for inbound and outbound transactions',
        );
      }
    }
    const { productId, warehouseId, expirationDate, ...rest } = data;
    const update: Partial<InventoryTransaction> = { ...rest };
    if (productId !== undefined) {
      update.productId = new Types.ObjectId(productId);
    }
    if (warehouseId !== undefined) {
      update.warehouseId = new Types.ObjectId(warehouseId);
    }
    if (expirationDate) {
      update.expirationDate = new Date(expirationDate);
    }
    return this.inventoryModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('productId', 'name kind')
      .populate('warehouseId', 'name');
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
