import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnitsService } from './units.service';
import { Unit } from './schemas/unit.schema';
import { ProductsService } from '../products/products.service';

describe('UnitsService', () => {
  let service: UnitsService;
  let unitModel: Record<string, jest.Mock>;
  let productsService: { existsByUnit: jest.Mock };

  const mockUnit = {
    id: 'unit-1',
    name: 'Botella',
    abbreviation: 'bt',
  };

  beforeEach(async () => {
    unitModel = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      exists: jest.fn(),
    };
    productsService = { existsByUnit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: getModelToken(Unit.name), useValue: unitModel },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
  });

  describe('create', () => {
    it('should create a unit', async () => {
      const data = { name: 'Botella', abbreviation: 'bt' };
      unitModel.create.mockResolvedValue(mockUnit);

      const result = await service.create(data);

      expect(unitModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockUnit);
    });

    it('should throw ConflictException on duplicate name or abbreviation', async () => {
      unitModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create({ name: 'Botella', abbreviation: 'bt' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllPaginated', () => {
    it('should return all units sorted by name', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUnit]),
      };
      unitModel.find.mockReturnValue(chainable);
      unitModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(1, 10);

      expect(unitModel.find).toHaveBeenCalledWith({});
      expect(chainable.sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual({ data: [mockUnit], total: 1 });
    });

    it('should apply case-insensitive search filter with regex escape', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      unitModel.find.mockReturnValue(chainable);
      unitModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(1, 10, { search: 'caj.* (a)' });

      expect(unitModel.find).toHaveBeenCalledWith({
        name: { $regex: 'caj\\.\\* \\(a\\)', $options: 'i' },
      });
    });

    it('should compute skip from page and limit', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      unitModel.find.mockReturnValue(chainable);
      unitModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(3, 20);

      expect(chainable.skip).toHaveBeenCalledWith(40);
      expect(chainable.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('findById', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should find a unit by id', async () => {
      unitModel.findById.mockResolvedValue(mockUnit);

      const result = await service.findById(validId);

      expect(unitModel.findById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(mockUnit);
    });

    it('should return null for malformed ids without hitting the database', async () => {
      const result = await service.findById('not-an-object-id');

      expect(result).toBeNull();
      expect(unitModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('findOptions', () => {
    it('should return id, name, and abbreviation only', async () => {
      const chainable = {
        sort: jest.fn().mockResolvedValue([mockUnit]),
      };
      unitModel.find.mockReturnValue(chainable);

      const result = await service.findOptions();

      expect(unitModel.find).toHaveBeenCalledWith(
        {},
        { name: 1, abbreviation: 1 },
      );
      expect(result).toEqual([
        { id: 'unit-1', name: 'Botella', abbreviation: 'bt' },
      ]);
    });
  });

  describe('existsById', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should return true when the unit exists', async () => {
      unitModel.exists.mockResolvedValue({ _id: validId });

      const result = await service.existsById(validId);

      expect(unitModel.exists).toHaveBeenCalledWith({ _id: validId });
      expect(result).toBe(true);
    });

    it('should return false when the unit does not exist', async () => {
      unitModel.exists.mockResolvedValue(null);

      const result = await service.existsById(validId);

      expect(result).toBe(false);
    });

    it('should return false for malformed ids without hitting the database', async () => {
      const result = await service.existsById('not-an-object-id');

      expect(result).toBe(false);
      expect(unitModel.exists).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return the unit', async () => {
      const updated = { ...mockUnit, name: 'Caja' };
      unitModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.update('unit-1', { name: 'Caja' });

      expect(unitModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'unit-1',
        { name: 'Caja' },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw ConflictException on duplicate', async () => {
      unitModel.findByIdAndUpdate.mockRejectedValue({ code: 11000 });

      await expect(
        service.update('unit-1', { name: 'Botella' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete when no products reference the unit', async () => {
      productsService.existsByUnit.mockResolvedValue(false);
      unitModel.findByIdAndDelete.mockResolvedValue(mockUnit);

      await service.remove('unit-1');

      expect(productsService.existsByUnit).toHaveBeenCalledWith('unit-1');
      expect(unitModel.findByIdAndDelete).toHaveBeenCalledWith('unit-1');
    });

    it('should throw ConflictException when products reference the unit', async () => {
      productsService.existsByUnit.mockResolvedValue(true);

      await expect(service.remove('unit-1')).rejects.toThrow(
        ConflictException,
      );
      expect(unitModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});
