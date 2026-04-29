import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { Product } from './schemas/product.schema';

describe('ProductsService', () => {
  let service: ProductsService;
  let model: Record<string, jest.Mock>;

  const mockGrocery = {
    id: 'product-1',
    name: 'Rice',
    kind: 'groceries',
    price: { value: 5, currency: 'USD' },
  };

  const mockLiquor = {
    id: 'product-2',
    name: 'Bacardi',
    kind: 'liquor',
    price: { value: 25, currency: 'USD' },
    liquorType: 'rum',
    presentation: 'L1',
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: model },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('should create a grocery product', async () => {
      const data = {
        name: 'Rice',
        kind: 'groceries' as const,
        price: { value: 5, currency: 'USD' as const },
      };
      model.create.mockResolvedValue(mockGrocery);

      const result = await service.create(data);

      expect(model.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockGrocery);
    });

    it('should create a liquor product with type and presentation', async () => {
      const data = {
        name: 'Bacardi',
        kind: 'liquor' as const,
        price: { value: 25, currency: 'USD' as const },
        liquorType: 'rum' as const,
        presentation: 'L1' as const,
      };
      model.create.mockResolvedValue(mockLiquor);

      const result = await service.create(data);

      expect(model.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockLiquor);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated data sorted by newest first with total count', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockGrocery, mockLiquor]),
      };
      model.find.mockReturnValue(chainable);
      model.countDocuments.mockResolvedValue(2);

      const result = await service.findAllPaginated(1, 10);

      expect(chainable.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chainable.skip).toHaveBeenCalledWith(0);
      expect(chainable.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({ data: [mockGrocery, mockLiquor], total: 2 });
    });

    it('should calculate correct skip for page 3', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      model.find.mockReturnValue(chainable);
      model.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(3, 20);

      expect(chainable.skip).toHaveBeenCalledWith(40);
      expect(chainable.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('findById', () => {
    it('should find a product by id', async () => {
      model.findById.mockResolvedValue(mockLiquor);

      const result = await service.findById('product-2');

      expect(model.findById).toHaveBeenCalledWith('product-2');
      expect(result).toEqual(mockLiquor);
    });

    it('should return null when not found', async () => {
      model.findById.mockResolvedValue(null);

      const result = await service.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update the product and return the updated doc', async () => {
      const updated = {
        ...mockGrocery,
        price: { value: 7, currency: 'USD' },
      };
      const data = {
        name: 'Rice',
        kind: 'groceries' as const,
        price: { value: 7, currency: 'USD' as const },
      };
      model.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.update('product-1', data);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'product-1',
        data,
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should return null when not found', async () => {
      model.findByIdAndUpdate.mockResolvedValue(null);

      const result = await service.update('missing', {
        name: 'Rice',
        kind: 'groceries',
        price: { value: 7, currency: 'USD' },
      });

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete the product by id', async () => {
      model.findByIdAndDelete.mockResolvedValue(mockGrocery);

      await service.remove('product-1');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('product-1');
    });
  });
});
