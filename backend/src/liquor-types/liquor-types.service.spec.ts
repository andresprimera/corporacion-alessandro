import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LiquorTypesService } from './liquor-types.service';
import { LiquorType } from './schemas/liquor-type.schema';
import { ProductsService } from '../products/products.service';

describe('LiquorTypesService', () => {
  let service: LiquorTypesService;
  let liquorTypeModel: Record<string, jest.Mock>;
  let productsService: { existsByLiquorType: jest.Mock };

  const mockLiquorType = {
    id: 'liquor-type-1',
    name: 'Ron',
    abbreviation: 'ron',
  };

  beforeEach(async () => {
    liquorTypeModel = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      exists: jest.fn(),
    };
    productsService = { existsByLiquorType: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiquorTypesService,
        {
          provide: getModelToken(LiquorType.name),
          useValue: liquorTypeModel,
        },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get<LiquorTypesService>(LiquorTypesService);
  });

  describe('create', () => {
    it('should create a liquor type', async () => {
      const data = { name: 'Ron', abbreviation: 'ron' };
      liquorTypeModel.create.mockResolvedValue(mockLiquorType);

      const result = await service.create(data);

      expect(liquorTypeModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockLiquorType);
    });

    it('should throw ConflictException on duplicate name or abbreviation', async () => {
      liquorTypeModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create({ name: 'Ron', abbreviation: 'ron' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllPaginated', () => {
    it('should return all liquor types sorted by name', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockLiquorType]),
      };
      liquorTypeModel.find.mockReturnValue(chainable);
      liquorTypeModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(1, 10);

      expect(liquorTypeModel.find).toHaveBeenCalledWith({});
      expect(chainable.sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual({ data: [mockLiquorType], total: 1 });
    });

    it('should apply case-insensitive search filter with regex escape', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      liquorTypeModel.find.mockReturnValue(chainable);
      liquorTypeModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(1, 10, { search: 'ron.* (special)' });

      expect(liquorTypeModel.find).toHaveBeenCalledWith({
        name: { $regex: 'ron\\.\\* \\(special\\)', $options: 'i' },
      });
    });
  });

  describe('findById', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should find a liquor type by id', async () => {
      liquorTypeModel.findById.mockResolvedValue(mockLiquorType);

      const result = await service.findById(validId);

      expect(liquorTypeModel.findById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(mockLiquorType);
    });

    it('should return null for malformed ids without hitting the database', async () => {
      const result = await service.findById('not-an-object-id');

      expect(result).toBeNull();
      expect(liquorTypeModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('findOptions', () => {
    it('should return id, name, and abbreviation only', async () => {
      const chainable = {
        sort: jest.fn().mockResolvedValue([mockLiquorType]),
      };
      liquorTypeModel.find.mockReturnValue(chainable);

      const result = await service.findOptions();

      expect(liquorTypeModel.find).toHaveBeenCalledWith(
        {},
        { name: 1, abbreviation: 1 },
      );
      expect(result).toEqual([
        { id: 'liquor-type-1', name: 'Ron', abbreviation: 'ron' },
      ]);
    });
  });

  describe('existsById', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should return true when the liquor type exists', async () => {
      liquorTypeModel.exists.mockResolvedValue({ _id: validId });

      const result = await service.existsById(validId);

      expect(liquorTypeModel.exists).toHaveBeenCalledWith({ _id: validId });
      expect(result).toBe(true);
    });

    it('should return false when the liquor type does not exist', async () => {
      liquorTypeModel.exists.mockResolvedValue(null);

      const result = await service.existsById(validId);

      expect(result).toBe(false);
    });

    it('should return false for malformed ids without hitting the database', async () => {
      const result = await service.existsById('not-an-object-id');

      expect(result).toBe(false);
      expect(liquorTypeModel.exists).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return the liquor type', async () => {
      const updated = { ...mockLiquorType, name: 'Whisky' };
      liquorTypeModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.update('liquor-type-1', { name: 'Whisky' });

      expect(liquorTypeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'liquor-type-1',
        { name: 'Whisky' },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw ConflictException on duplicate', async () => {
      liquorTypeModel.findByIdAndUpdate.mockRejectedValue({ code: 11000 });

      await expect(
        service.update('liquor-type-1', { name: 'Ron' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete when no products reference the liquor type', async () => {
      productsService.existsByLiquorType.mockResolvedValue(false);
      liquorTypeModel.findByIdAndDelete.mockResolvedValue(mockLiquorType);

      await service.remove('liquor-type-1');

      expect(productsService.existsByLiquorType).toHaveBeenCalledWith(
        'liquor-type-1',
      );
      expect(liquorTypeModel.findByIdAndDelete).toHaveBeenCalledWith(
        'liquor-type-1',
      );
    });

    it('should throw ConflictException when products reference the liquor type', async () => {
      productsService.existsByLiquorType.mockResolvedValue(true);

      await expect(service.remove('liquor-type-1')).rejects.toThrow(
        ConflictException,
      );
      expect(liquorTypeModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});
