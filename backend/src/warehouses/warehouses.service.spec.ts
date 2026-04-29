import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { WarehousesService } from './warehouses.service';
import { Warehouse } from './schemas/warehouse.schema';
import { CitiesService } from '../cities/cities.service';
import { InventoryService } from '../inventory/inventory.service';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let warehouseModel: Record<string, jest.Mock>;
  let citiesService: { findById: jest.Mock };
  let inventoryService: { existsByWarehouse: jest.Mock };

  const cityOid = new Types.ObjectId().toString();
  const mockWarehouse = {
    id: 'warehouse-1',
    name: 'Caracas Main',
    cityId: cityOid,
    address: 'Av. Principal',
    isActive: true,
  };
  const populatedChain = (
    resolved: unknown,
  ): { populate: jest.Mock } => {
    const chain: { populate: jest.Mock } = { populate: jest.fn() };
    chain.populate.mockResolvedValue(resolved);
    return chain;
  };

  beforeEach(async () => {
    warehouseModel = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      exists: jest.fn(),
    };
    citiesService = { findById: jest.fn() };
    inventoryService = { existsByWarehouse: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: getModelToken(Warehouse.name), useValue: warehouseModel },
        { provide: CitiesService, useValue: citiesService },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
  });

  describe('create', () => {
    it('should create a warehouse when the city is active', async () => {
      citiesService.findById.mockResolvedValue({
        id: cityOid,
        isActive: true,
      });
      const populate = jest.fn().mockResolvedValue(undefined);
      const created = { ...mockWarehouse, populate };
      warehouseModel.create.mockResolvedValue(created);

      const data = {
        name: 'Caracas Main',
        cityId: cityOid,
        address: 'Av. Principal',
        isActive: true,
      };
      const result = await service.create(data);

      expect(citiesService.findById).toHaveBeenCalledWith(cityOid);
      expect(warehouseModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Caracas Main' }),
      );
      expect(populate).toHaveBeenCalledWith('cityId', 'name');
      expect(result).toBe(created);
    });

    it('should throw NotFoundException when city is missing', async () => {
      citiesService.findById.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'X',
          cityId: cityOid,
          isActive: true,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(warehouseModel.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when city is inactive', async () => {
      citiesService.findById.mockResolvedValue({
        id: cityOid,
        isActive: false,
      });

      await expect(
        service.create({
          name: 'X',
          cityId: cityOid,
          isActive: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on duplicate name', async () => {
      citiesService.findById.mockResolvedValue({
        id: cityOid,
        isActive: true,
      });
      warehouseModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create({
          name: 'Caracas Main',
          cityId: cityOid,
          isActive: true,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated data populated with city', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([mockWarehouse]),
      };
      warehouseModel.find.mockReturnValue(chainable);
      warehouseModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(1, 10);

      expect(warehouseModel.find).toHaveBeenCalledWith({});
      expect(chainable.skip).toHaveBeenCalledWith(0);
      expect(chainable.populate).toHaveBeenCalledWith('cityId', 'name');
      expect(result).toEqual({ data: [mockWarehouse], total: 1 });
    });

    it('should apply onlyActive filter when requested', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      warehouseModel.find.mockReturnValue(chainable);
      warehouseModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(1, 10, { onlyActive: true });

      expect(warehouseModel.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('findById', () => {
    it('should populate city', async () => {
      warehouseModel.findById.mockReturnValue(populatedChain(mockWarehouse));

      const result = await service.findById('warehouse-1');

      expect(warehouseModel.findById).toHaveBeenCalledWith('warehouse-1');
      expect(result).toEqual(mockWarehouse);
    });
  });

  describe('update', () => {
    it('should update without re-checking city when cityId is unchanged', async () => {
      const updated = { ...mockWarehouse, isActive: false };
      warehouseModel.findByIdAndUpdate.mockReturnValue(populatedChain(updated));

      const result = await service.update('warehouse-1', { isActive: false });

      expect(citiesService.findById).not.toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('should re-validate the city when cityId changes', async () => {
      citiesService.findById.mockResolvedValue(null);

      await expect(
        service.update('warehouse-1', { cityId: cityOid }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete when no transactions exist', async () => {
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

    it('should throw ConflictException when transactions reference the warehouse', async () => {
      inventoryService.existsByWarehouse.mockResolvedValue(true);

      await expect(service.remove('warehouse-1')).rejects.toThrow(
        ConflictException,
      );
      expect(warehouseModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });

  describe('existsByCity', () => {
    it('should return true when at least one warehouse exists', async () => {
      warehouseModel.exists.mockResolvedValue({ _id: 'w1' });

      const result = await service.existsByCity('city-1');

      expect(warehouseModel.exists).toHaveBeenCalledWith({ cityId: 'city-1' });
      expect(result).toBe(true);
    });

    it('should return false when no warehouses exist', async () => {
      warehouseModel.exists.mockResolvedValue(null);

      expect(await service.existsByCity('city-1')).toBe(false);
    });
  });
});
