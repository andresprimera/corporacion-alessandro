import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PresentationsService } from './presentations.service';
import { Presentation } from './schemas/presentation.schema';
import { ProductsService } from '../products/products.service';

describe('PresentationsService', () => {
  let service: PresentationsService;
  let presentationModel: Record<string, jest.Mock>;
  let productsService: { existsByPresentation: jest.Mock };

  const mockPresentation = {
    id: 'presentation-1',
    name: '750 ml',
    abbreviation: '750ml',
  };

  beforeEach(async () => {
    presentationModel = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      exists: jest.fn(),
    };
    productsService = { existsByPresentation: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresentationsService,
        {
          provide: getModelToken(Presentation.name),
          useValue: presentationModel,
        },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get<PresentationsService>(PresentationsService);
  });

  describe('create', () => {
    it('should create a presentation', async () => {
      const data = { name: '750 ml', abbreviation: '750ml' };
      presentationModel.create.mockResolvedValue(mockPresentation);

      const result = await service.create(data);

      expect(presentationModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockPresentation);
    });

    it('should throw ConflictException on duplicate name or abbreviation', async () => {
      presentationModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create({ name: '750 ml', abbreviation: '750ml' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllPaginated', () => {
    it('should return all presentations sorted by name', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockPresentation]),
      };
      presentationModel.find.mockReturnValue(chainable);
      presentationModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(1, 10);

      expect(presentationModel.find).toHaveBeenCalledWith({});
      expect(chainable.sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual({ data: [mockPresentation], total: 1 });
    });

    it('should apply case-insensitive search filter with regex escape', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      presentationModel.find.mockReturnValue(chainable);
      presentationModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(1, 10, { search: '750.* (ml)' });

      expect(presentationModel.find).toHaveBeenCalledWith({
        name: { $regex: '750\\.\\* \\(ml\\)', $options: 'i' },
      });
    });

    it('should compute skip from page and limit', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      presentationModel.find.mockReturnValue(chainable);
      presentationModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(3, 20);

      expect(chainable.skip).toHaveBeenCalledWith(40);
      expect(chainable.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('findById', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should find a presentation by id', async () => {
      presentationModel.findById.mockResolvedValue(mockPresentation);

      const result = await service.findById(validId);

      expect(presentationModel.findById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(mockPresentation);
    });

    it('should return null for malformed ids without hitting the database', async () => {
      const result = await service.findById('not-an-object-id');

      expect(result).toBeNull();
      expect(presentationModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('findOptions', () => {
    it('should return id, name, and abbreviation only', async () => {
      const chainable = {
        sort: jest.fn().mockResolvedValue([mockPresentation]),
      };
      presentationModel.find.mockReturnValue(chainable);

      const result = await service.findOptions();

      expect(presentationModel.find).toHaveBeenCalledWith(
        {},
        { name: 1, abbreviation: 1 },
      );
      expect(result).toEqual([
        { id: 'presentation-1', name: '750 ml', abbreviation: '750ml' },
      ]);
    });
  });

  describe('existsById', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should return true when the presentation exists', async () => {
      presentationModel.exists.mockResolvedValue({ _id: validId });

      const result = await service.existsById(validId);

      expect(presentationModel.exists).toHaveBeenCalledWith({ _id: validId });
      expect(result).toBe(true);
    });

    it('should return false when the presentation does not exist', async () => {
      presentationModel.exists.mockResolvedValue(null);

      const result = await service.existsById(validId);

      expect(result).toBe(false);
    });

    it('should return false for malformed ids without hitting the database', async () => {
      const result = await service.existsById('not-an-object-id');

      expect(result).toBe(false);
      expect(presentationModel.exists).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return the presentation', async () => {
      const updated = { ...mockPresentation, name: '1 Litro' };
      presentationModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.update('presentation-1', { name: '1 Litro' });

      expect(presentationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'presentation-1',
        { name: '1 Litro' },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw ConflictException on duplicate', async () => {
      presentationModel.findByIdAndUpdate.mockRejectedValue({ code: 11000 });

      await expect(
        service.update('presentation-1', { name: '750 ml' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete when no products reference the presentation', async () => {
      productsService.existsByPresentation.mockResolvedValue(false);
      presentationModel.findByIdAndDelete.mockResolvedValue(mockPresentation);

      await service.remove('presentation-1');

      expect(productsService.existsByPresentation).toHaveBeenCalledWith(
        'presentation-1',
      );
      expect(presentationModel.findByIdAndDelete).toHaveBeenCalledWith(
        'presentation-1',
      );
    });

    it('should throw ConflictException when products reference the presentation', async () => {
      productsService.existsByPresentation.mockResolvedValue(true);

      await expect(service.remove('presentation-1')).rejects.toThrow(
        ConflictException,
      );
      expect(presentationModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});
