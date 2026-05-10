import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { WarehousesService } from './warehouses.service';
import { Warehouse } from './schemas/warehouse.schema';
import { InventoryService } from '../inventory/inventory.service';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let warehouseModel: Record<string, jest.Mock>;
  let inventoryService: { existsByWarehouse: jest.Mock };

  const mockWarehouse = {
    id: 'warehouse-1',
    name: 'Caracas Main',
    address: 'Av. Principal',
    isActive: true,
  };

  beforeEach(async () => {
    warehouseModel = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    inventoryService = { existsByWarehouse: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: getModelToken(Warehouse.name), useValue: warehouseModel },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
  });

  describe('create', () => {
    it('creates a warehouse', async () => {
      warehouseModel.create.mockResolvedValue(mockWarehouse);

      const data = {
        name: 'Caracas Main',
        address: 'Av. Principal',
        isActive: true,
      };
      const result = await service.create(data);

      expect(warehouseModel.create).toHaveBeenCalledWith(data);
      expect(result).toBe(mockWarehouse);
    });

    it('throws ConflictException on duplicate name', async () => {
      warehouseModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create({ name: 'Caracas Main', isActive: true }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllPaginated', () => {
    it('returns paginated data', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockWarehouse]),
      };
      warehouseModel.find.mockReturnValue(chainable);
      warehouseModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(1, 10);

      expect(warehouseModel.find).toHaveBeenCalledWith({});
      expect(chainable.skip).toHaveBeenCalledWith(0);
      expect(result).toEqual({ data: [mockWarehouse], total: 1 });
    });

    it('applies onlyActive filter when requested', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      warehouseModel.find.mockReturnValue(chainable);
      warehouseModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(1, 10, { onlyActive: true });

      expect(warehouseModel.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('findById', () => {
    it('returns the warehouse by id', async () => {
      warehouseModel.findById.mockResolvedValue(mockWarehouse);

      const result = await service.findById('warehouse-1');

      expect(warehouseModel.findById).toHaveBeenCalledWith('warehouse-1');
      expect(result).toBe(mockWarehouse);
    });
  });

  describe('update', () => {
    it('updates the warehouse', async () => {
      const updated = { ...mockWarehouse, isActive: false };
      warehouseModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.update('warehouse-1', { isActive: false });

      expect(warehouseModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'warehouse-1',
        { isActive: false },
        { new: true },
      );
      expect(result).toBe(updated);
    });
  });

  describe('remove', () => {
    it('deletes when no transactions exist', async () => {
      inventoryService.existsByWarehouse.mockResolvedValue(false);
      warehouseModel.findByIdAndDelete.mockResolvedValue(mockWarehouse);

      await service.remove('warehouse-1');

      expect(inventoryService.existsByWarehouse).toHaveBeenCalledWith(
        'warehouse-1',
      );
      expect(warehouseModel.findByIdAndDelete).toHaveBeenCalledWith(
        'warehouse-1',
      );
    });

    it('throws ConflictException when transactions reference the warehouse', async () => {
      inventoryService.existsByWarehouse.mockResolvedValue(true);

      await expect(service.remove('warehouse-1')).rejects.toThrow(
        ConflictException,
      );
      expect(warehouseModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });

  describe('findAllActive', () => {
    it('returns all active warehouses sorted by name', async () => {
      const chainable = {
        sort: jest.fn().mockResolvedValue([mockWarehouse]),
      };
      warehouseModel.find.mockReturnValue(chainable);

      const result = await service.findAllActive();

      expect(warehouseModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(chainable.sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual([mockWarehouse]);
    });
  });
});
