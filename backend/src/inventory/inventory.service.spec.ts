import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { InventoryService } from './inventory.service';
import { InventoryTransaction } from './schemas/inventory-transaction.schema';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';

const productOid = new Types.ObjectId().toString();
const warehouseOid = new Types.ObjectId().toString();

describe('InventoryService', () => {
  let service: InventoryService;
  let model: Record<string, jest.Mock>;
  let productsService: { findById: jest.Mock };
  let warehousesService: { findById: jest.Mock };

  const createdBy = { userId: 'user-1', name: 'Alice' };
  const validInbound = {
    productId: productOid,
    warehouseId: warehouseOid,
    transactionType: 'inbound' as const,
    batch: 'BATCH-001',
    qty: 100,
  };

  const populatedChain = (
    resolved: unknown,
  ): { populate: jest.Mock } => {
    const chain: { populate: jest.Mock } = { populate: jest.fn() };
    chain.populate
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce(resolved);
    return chain;
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      aggregate: jest.fn(),
      exists: jest.fn(),
    };
    productsService = { findById: jest.fn() };
    warehousesService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getModelToken(InventoryTransaction.name), useValue: model },
        { provide: ProductsService, useValue: productsService },
        { provide: WarehousesService, useValue: warehousesService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('create', () => {
    it('should create a transaction when product and warehouse are valid', async () => {
      productsService.findById.mockResolvedValue({ id: productOid });
      warehousesService.findById.mockResolvedValue({
        id: warehouseOid,
        isActive: true,
      });
      const populate = jest.fn().mockResolvedValue(undefined);
      const created = {
        id: 'tx-1',
        ...validInbound,
        createdBy,
        populate,
      };
      model.create.mockResolvedValue(created);

      const result = await service.create(validInbound, createdBy);

      expect(productsService.findById).toHaveBeenCalledWith(productOid);
      expect(warehousesService.findById).toHaveBeenCalledWith(warehouseOid);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          batch: 'BATCH-001',
          qty: 100,
          transactionType: 'inbound',
          createdBy,
        }),
      );
      expect(populate).toHaveBeenCalled();
      expect(result).toBe(created);
    });

    it('should throw NotFoundException when product is missing', async () => {
      productsService.findById.mockResolvedValue(null);

      await expect(service.create(validInbound, createdBy)).rejects.toThrow(
        NotFoundException,
      );
      expect(model.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when warehouse is missing', async () => {
      productsService.findById.mockResolvedValue({ id: productOid });
      warehousesService.findById.mockResolvedValue(null);

      await expect(service.create(validInbound, createdBy)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when warehouse is inactive', async () => {
      productsService.findById.mockResolvedValue({ id: productOid });
      warehousesService.findById.mockResolvedValue({
        id: warehouseOid,
        isActive: false,
      });

      await expect(service.create(validInbound, createdBy)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllPaginated', () => {
    it('should return populated paginated data', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
      };
      // Last populate resolves to data
      chainable.populate
        .mockReturnValueOnce(chainable)
        .mockResolvedValueOnce([{ id: 'tx-1' }]);
      model.find.mockReturnValue(chainable);
      model.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(2, 10);

      expect(chainable.skip).toHaveBeenCalledWith(10);
      expect(chainable.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({ data: [{ id: 'tx-1' }], total: 1 });
    });
  });

  describe('findById', () => {
    it('should populate product and warehouse', async () => {
      model.findById.mockReturnValue(populatedChain({ id: 'tx-1' }));

      const result = await service.findById('tx-1');

      expect(model.findById).toHaveBeenCalledWith('tx-1');
      expect(result).toEqual({ id: 'tx-1' });
    });
  });

  describe('update', () => {
    it('should update without re-checking refs when product/warehouse not changed', async () => {
      model.findById.mockResolvedValue({
        id: 'tx-1',
        qty: 100,
        transactionType: 'inbound',
      });
      model.findByIdAndUpdate.mockReturnValue(
        populatedChain({ id: 'tx-1', qty: 120 }),
      );

      const result = await service.update('tx-1', { qty: 120 });

      expect(productsService.findById).not.toHaveBeenCalled();
      expect(warehousesService.findById).not.toHaveBeenCalled();
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({ qty: 120 }),
        { new: true },
      );
      expect(result).toEqual({ id: 'tx-1', qty: 120 });
    });

    it('should re-validate refs when productId changes', async () => {
      productsService.findById.mockResolvedValue(null);

      await expect(
        service.update('tx-1', { productId: productOid }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject negative qty when existing type is inbound', async () => {
      model.findById.mockResolvedValue({
        id: 'tx-1',
        qty: 100,
        transactionType: 'inbound',
      });

      await expect(service.update('tx-1', { qty: -5 })).rejects.toThrow(
        BadRequestException,
      );
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should accept negative qty when merged type is adjustment', async () => {
      model.findById.mockResolvedValue({
        id: 'tx-1',
        qty: 100,
        transactionType: 'adjustment',
      });
      model.findByIdAndUpdate.mockReturnValue(
        populatedChain({ id: 'tx-1', qty: -5 }),
      );

      const result = await service.update('tx-1', { qty: -5 });

      expect(result).toEqual({ id: 'tx-1', qty: -5 });
    });
  });

  describe('remove', () => {
    it('should delete by id', async () => {
      model.findByIdAndDelete.mockResolvedValue({ id: 'tx-1' });

      await service.remove('tx-1');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('tx-1');
    });
  });

  describe('existsByWarehouse', () => {
    it('should return true when at least one transaction exists', async () => {
      model.exists.mockResolvedValue({ _id: 'tx-1' });

      const result = await service.existsByWarehouse(warehouseOid);

      expect(model.exists).toHaveBeenCalledWith({ warehouseId: warehouseOid });
      expect(result).toBe(true);
    });

    it('should return false when no transactions exist', async () => {
      model.exists.mockResolvedValue(null);

      expect(await service.existsByWarehouse(warehouseOid)).toBe(false);
    });
  });

  describe('findStockAggregated', () => {
    it('should return aggregated stock per product', async () => {
      const facetResult = [
        {
          data: [
            {
              productId: productOid,
              productName: 'Rice',
              productKind: 'groceries',
              totalQty: 65,
            },
          ],
          total: [{ count: 1 }],
        },
      ];
      model.aggregate.mockResolvedValue(facetResult);

      const result = await service.findStockAggregated({ page: 1, limit: 10 });

      expect(model.aggregate).toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({
        productId: productOid,
        totalQty: 65,
      });
    });

    it('should return empty data when no transactions exist', async () => {
      model.aggregate.mockResolvedValue([]);

      const result = await service.findStockAggregated({ page: 1, limit: 10 });

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('findStockByWarehouse', () => {
    it('should return per-warehouse stock', async () => {
      const facetResult = [
        {
          data: [
            {
              productId: productOid,
              productName: 'Rice',
              productKind: 'groceries',
              warehouseId: warehouseOid,
              warehouseName: 'Caracas Main',
              totalQty: 65,
            },
          ],
          total: [{ count: 1 }],
        },
      ];
      model.aggregate.mockResolvedValue(facetResult);

      const result = await service.findStockByWarehouse({
        page: 1,
        limit: 10,
        warehouseId: warehouseOid,
      });

      expect(model.aggregate).toHaveBeenCalled();
      expect(result.data[0]).toMatchObject({
        productId: productOid,
        warehouseId: warehouseOid,
        totalQty: 65,
      });
    });
  });
});
