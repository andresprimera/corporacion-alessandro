import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CitiesService } from './cities.service';
import { City } from './schemas/city.schema';
import { WarehousesService } from '../warehouses/warehouses.service';

describe('CitiesService', () => {
  let service: CitiesService;
  let cityModel: Record<string, jest.Mock>;
  let warehousesService: { existsByCity: jest.Mock };

  const mockCity = {
    id: 'city-1',
    name: 'Caracas',
    isActive: true,
  };

  beforeEach(async () => {
    cityModel = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    warehousesService = { existsByCity: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitiesService,
        { provide: getModelToken(City.name), useValue: cityModel },
        { provide: WarehousesService, useValue: warehousesService },
      ],
    }).compile();

    service = module.get<CitiesService>(CitiesService);
  });

  describe('create', () => {
    it('should create a city', async () => {
      const data = { name: 'Caracas', isActive: true };
      cityModel.create.mockResolvedValue(mockCity);

      const result = await service.create(data);

      expect(cityModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockCity);
    });

    it('should throw ConflictException on duplicate name', async () => {
      cityModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create({ name: 'Caracas', isActive: true }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllPaginated', () => {
    it('should return all cities sorted by name', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockCity]),
      };
      cityModel.find.mockReturnValue(chainable);
      cityModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(1, 10);

      expect(cityModel.find).toHaveBeenCalledWith({});
      expect(chainable.sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual({ data: [mockCity], total: 1 });
    });

    it('should apply onlyActive filter', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      cityModel.find.mockReturnValue(chainable);
      cityModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(1, 10, { onlyActive: true });

      expect(cityModel.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('findById', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should find a city by id', async () => {
      cityModel.findById.mockResolvedValue(mockCity);

      const result = await service.findById(validId);

      expect(cityModel.findById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(mockCity);
    });

    it('should return null for malformed ids without hitting the database', async () => {
      const result = await service.findById('not-an-object-id');

      expect(result).toBeNull();
      expect(cityModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return the city', async () => {
      const updated = { ...mockCity, isActive: false };
      cityModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.update('city-1', { isActive: false });

      expect(cityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'city-1',
        { isActive: false },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw ConflictException on duplicate name', async () => {
      cityModel.findByIdAndUpdate.mockRejectedValue({ code: 11000 });

      await expect(
        service.update('city-1', { name: 'Caracas' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete when no warehouses reference the city', async () => {
      warehousesService.existsByCity.mockResolvedValue(false);
      cityModel.findByIdAndDelete.mockResolvedValue(mockCity);

      await service.remove('city-1');

      expect(warehousesService.existsByCity).toHaveBeenCalledWith('city-1');
      expect(cityModel.findByIdAndDelete).toHaveBeenCalledWith('city-1');
    });

    it('should throw ConflictException when warehouses reference the city', async () => {
      warehousesService.existsByCity.mockResolvedValue(true);

      await expect(service.remove('city-1')).rejects.toThrow(
        ConflictException,
      );
      expect(cityModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});
