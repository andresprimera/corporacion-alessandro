import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { Product } from './schemas/product.schema';
import { UnitsService } from '../units/units.service';
import { PresentationsService } from '../presentations/presentations.service';
import { LiquorTypesService } from '../liquor-types/liquor-types.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let model: Record<string, jest.Mock>;
  let unitsService: { existsById: jest.Mock };
  let presentationsService: { existsById: jest.Mock };
  let liquorTypesService: { existsById: jest.Mock };

  const validBasicUnitId = '507f1f77bcf86cd799439011';
  const validPackageUnitId = '507f1f77bcf86cd799439012';
  const validPresentationId = '507f1f77bcf86cd799439013';
  const validLiquorTypeId = '507f1f77bcf86cd799439014';

  const mockGrocery = {
    id: 'product-1',
    name: 'Rice',
    kind: 'groceries',
    price: { value: 5, currency: 'USD' },
    basicUnitId: validBasicUnitId,
    populate: jest.fn().mockResolvedValue(undefined),
  };

  const mockLiquor = {
    id: 'product-2',
    name: 'Bacardi',
    kind: 'liquor',
    price: { value: 25, currency: 'USD' },
    liquorTypeId: validLiquorTypeId,
    presentationId: validPresentationId,
    basicUnitId: validBasicUnitId,
    packageUnitId: validPackageUnitId,
    unitsPerPackage: 12,
    populate: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      exists: jest.fn(),
    };
    unitsService = {
      existsById: jest.fn().mockResolvedValue(true),
    };
    presentationsService = {
      existsById: jest.fn().mockResolvedValue(true),
    };
    liquorTypesService = {
      existsById: jest.fn().mockResolvedValue(true),
    };
    mockGrocery.populate.mockClear();
    mockLiquor.populate.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: model },
        { provide: UnitsService, useValue: unitsService },
        { provide: PresentationsService, useValue: presentationsService },
        { provide: LiquorTypesService, useValue: liquorTypesService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('should create a grocery product with a basic unit', async () => {
      const data = {
        name: 'Rice',
        kind: 'groceries' as const,
        price: { value: 5, currency: 'USD' as const },
        basicUnitId: validBasicUnitId,
      };
      model.create.mockResolvedValue(mockGrocery);

      const result = await service.create(data);

      expect(unitsService.existsById).toHaveBeenCalledWith(validBasicUnitId);
      expect(model.create).toHaveBeenCalled();
      expect(mockGrocery.populate).toHaveBeenCalled();
      expect(result).toEqual(mockGrocery);
    });

    it('should create a liquor product with basic and package units', async () => {
      const data = {
        name: 'Bacardi',
        kind: 'liquor' as const,
        price: { value: 25, currency: 'USD' as const },
        liquorTypeId: validLiquorTypeId,
        presentationId: validPresentationId,
        basicUnitId: validBasicUnitId,
        packageUnitId: validPackageUnitId,
        unitsPerPackage: 12,
      };
      model.create.mockResolvedValue(mockLiquor);

      const result = await service.create(data);

      expect(unitsService.existsById).toHaveBeenNthCalledWith(
        1,
        validBasicUnitId,
      );
      expect(unitsService.existsById).toHaveBeenNthCalledWith(
        2,
        validPackageUnitId,
      );
      expect(presentationsService.existsById).toHaveBeenCalledWith(
        validPresentationId,
      );
      expect(result).toEqual(mockLiquor);
    });

    it('should throw BadRequestException when presentation does not exist', async () => {
      presentationsService.existsById.mockResolvedValueOnce(false);

      await expect(
        service.create({
          name: 'Bacardi',
          kind: 'liquor',
          price: { value: 25, currency: 'USD' },
          liquorTypeId: validLiquorTypeId,
          presentationId: 'missing-presentation',
          basicUnitId: validBasicUnitId,
          packageUnitId: validPackageUnitId,
          unitsPerPackage: 12,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when basic unit does not exist', async () => {
      unitsService.existsById.mockResolvedValueOnce(false);

      await expect(
        service.create({
          name: 'Rice',
          kind: 'groceries',
          price: { value: 5, currency: 'USD' },
          basicUnitId: 'missing-unit',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when package unit does not exist', async () => {
      unitsService.existsById
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        service.create({
          name: 'Bacardi',
          kind: 'liquor',
          price: { value: 25, currency: 'USD' },
          liquorTypeId: validLiquorTypeId,
          presentationId: validPresentationId,
          basicUnitId: validBasicUnitId,
          packageUnitId: 'missing-package-unit',
          unitsPerPackage: 12,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when liquor type does not exist', async () => {
      liquorTypesService.existsById.mockResolvedValueOnce(false);

      await expect(
        service.create({
          name: 'Bacardi',
          kind: 'liquor',
          price: { value: 25, currency: 'USD' },
          liquorTypeId: 'missing-liquor-type',
          presentationId: validPresentationId,
          basicUnitId: validBasicUnitId,
          packageUnitId: validPackageUnitId,
          unitsPerPackage: 12,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllPaginated', () => {
    function buildChain(data: unknown[]): {
      sort: jest.Mock;
      skip: jest.Mock;
      limit: jest.Mock;
      populate: jest.Mock;
    } {
      return {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(data),
      };
    }

    it('should return alphabetically-sorted data with no filters', async () => {
      const chain = buildChain([mockGrocery, mockLiquor]);
      model.find.mockReturnValue(chain);
      model.countDocuments.mockResolvedValue(2);

      const result = await service.findAllPaginated({ page: 1, limit: 10 });

      expect(model.find).toHaveBeenCalledWith({});
      expect(chain.sort).toHaveBeenCalledWith({ name: 1 });
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(chain.populate).toHaveBeenCalled();
      expect(result).toEqual({ data: [mockGrocery, mockLiquor], total: 2 });
    });

    it('should filter by kind', async () => {
      const chain = buildChain([mockLiquor]);
      model.find.mockReturnValue(chain);
      model.countDocuments.mockResolvedValue(1);

      await service.findAllPaginated({ page: 1, limit: 10, kind: 'liquor' });

      expect(model.find).toHaveBeenCalledWith({ kind: 'liquor' });
      expect(model.countDocuments).toHaveBeenCalledWith({ kind: 'liquor' });
    });

    it('should force kind=liquor when liquorTypeId is provided', async () => {
      const chain = buildChain([mockLiquor]);
      model.find.mockReturnValue(chain);
      model.countDocuments.mockResolvedValue(1);

      await service.findAllPaginated({
        page: 1,
        limit: 10,
        liquorTypeId: validLiquorTypeId,
      });

      expect(model.find).toHaveBeenCalledWith({
        kind: 'liquor',
        liquorTypeId: expect.anything(),
      });
    });

    it('should filter by full price range', async () => {
      const chain = buildChain([mockGrocery]);
      model.find.mockReturnValue(chain);
      model.countDocuments.mockResolvedValue(1);

      await service.findAllPaginated({
        page: 1,
        limit: 10,
        minPrice: 5,
        maxPrice: 50,
      });

      expect(model.find).toHaveBeenCalledWith({
        'price.value': { $gte: 5, $lte: 50 },
      });
    });

    it('should filter by case-insensitive name search with regex escape', async () => {
      const chain = buildChain([]);
      model.find.mockReturnValue(chain);
      model.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated({
        page: 1,
        limit: 10,
        search: 'rum.* (special)',
      });

      expect(model.find).toHaveBeenCalledWith({
        name: { $regex: 'rum\\.\\* \\(special\\)', $options: 'i' },
      });
    });

    it('should compute skip from page and limit', async () => {
      const chain = buildChain([]);
      model.find.mockReturnValue(chain);
      model.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated({ page: 3, limit: 20 });

      expect(chain.skip).toHaveBeenCalledWith(40);
      expect(chain.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('findById', () => {
    it('should populate units and return the doc', async () => {
      const populate = jest.fn().mockResolvedValue(mockLiquor);
      model.findById.mockReturnValue({ populate });

      const result = await service.findById('product-2');

      expect(model.findById).toHaveBeenCalledWith('product-2');
      expect(populate).toHaveBeenCalled();
      expect(result).toEqual(mockLiquor);
    });

    it('should return null when not found', async () => {
      const populate = jest.fn().mockResolvedValue(null);
      model.findById.mockReturnValue({ populate });

      const result = await service.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should validate units, update, and populate', async () => {
      const updated = { ...mockGrocery, price: { value: 7, currency: 'USD' } };
      const populate = jest.fn().mockResolvedValue(updated);
      model.findByIdAndUpdate.mockReturnValue({ populate });

      const data = {
        name: 'Rice',
        kind: 'groceries' as const,
        price: { value: 7, currency: 'USD' as const },
        basicUnitId: validBasicUnitId,
      };

      const result = await service.update('product-1', data);

      expect(unitsService.existsById).toHaveBeenCalledWith(validBasicUnitId);
      expect(model.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException when basic unit is missing', async () => {
      unitsService.existsById.mockResolvedValueOnce(false);

      await expect(
        service.update('product-1', {
          name: 'Rice',
          kind: 'groceries',
          price: { value: 7, currency: 'USD' },
          basicUnitId: 'missing-unit',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the product by id', async () => {
      model.findByIdAndDelete.mockResolvedValue(mockGrocery);

      await service.remove('product-1');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('product-1');
    });
  });

  describe('existsByUnit', () => {
    it('should return true when a product references the unit', async () => {
      model.exists.mockResolvedValue({ _id: 'product-2' });

      const result = await service.existsByUnit(validBasicUnitId);

      expect(model.exists).toHaveBeenCalledWith({
        $or: [
          expect.objectContaining({ basicUnitId: expect.anything() }),
          expect.objectContaining({ packageUnitId: expect.anything() }),
        ],
      });
      expect(result).toBe(true);
    });

    it('should return false when no product references the unit', async () => {
      model.exists.mockResolvedValue(null);

      const result = await service.existsByUnit(validBasicUnitId);

      expect(result).toBe(false);
    });

    it('should return false for malformed ObjectId without hitting the DB', async () => {
      const result = await service.existsByUnit('not-an-object-id');

      expect(result).toBe(false);
      expect(model.exists).not.toHaveBeenCalled();
    });
  });

  describe('existsByPresentation', () => {
    it('should return true when a product references the presentation', async () => {
      model.exists.mockResolvedValue({ _id: 'product-2' });

      const result = await service.existsByPresentation(validPresentationId);

      expect(model.exists).toHaveBeenCalledWith({
        presentationId: expect.anything(),
      });
      expect(result).toBe(true);
    });

    it('should return false when no product references the presentation', async () => {
      model.exists.mockResolvedValue(null);

      const result = await service.existsByPresentation(validPresentationId);

      expect(result).toBe(false);
    });

    it('should return false for malformed ObjectId without hitting the DB', async () => {
      const result = await service.existsByPresentation('not-an-object-id');

      expect(result).toBe(false);
      expect(model.exists).not.toHaveBeenCalled();
    });
  });

  describe('existsByLiquorType', () => {
    it('should return true when a product references the liquor type', async () => {
      model.exists.mockResolvedValue({ _id: 'product-2' });

      const result = await service.existsByLiquorType(validLiquorTypeId);

      expect(model.exists).toHaveBeenCalledWith({
        liquorTypeId: expect.anything(),
      });
      expect(result).toBe(true);
    });

    it('should return false when no product references the liquor type', async () => {
      model.exists.mockResolvedValue(null);

      const result = await service.existsByLiquorType(validLiquorTypeId);

      expect(result).toBe(false);
    });

    it('should return false for malformed ObjectId without hitting the DB', async () => {
      const result = await service.existsByLiquorType('not-an-object-id');

      expect(result).toBe(false);
      expect(model.exists).not.toHaveBeenCalled();
    });
  });
});
