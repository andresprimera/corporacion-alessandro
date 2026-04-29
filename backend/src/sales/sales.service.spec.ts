import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { Sale } from './schemas/sale.schema';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { InventoryService } from '../inventory/inventory.service';

describe('SalesService', () => {
  let service: SalesService;
  let saleModel: Record<string, jest.Mock>;

  const productsService = { findById: jest.fn() };
  const warehousesService = { findById: jest.fn() };
  const inventoryService = {
    create: jest.fn(),
    findAvailableStock: jest.fn(),
  };

  const VALID_PRODUCT_ID = '507f1f77bcf86cd799439011';
  const VALID_WAREHOUSE_A = '507f1f77bcf86cd799439021';
  const VALID_WAREHOUSE_B = '507f1f77bcf86cd799439022';

  const mockProduct = {
    id: VALID_PRODUCT_ID,
    name: 'Harina PAN 1kg',
    kind: 'groceries',
    price: { value: 1.5, currency: 'USD' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    saleModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getModelToken(Sale.name), useValue: saleModel },
        { provide: ProductsService, useValue: productsService },
        { provide: WarehousesService, useValue: warehousesService },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);

    // Default: sale-number lookup returns no prior sales
    saleModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(null),
    });
  });

  describe('create', () => {
    const soldBy = { userId: 'user-1', name: 'Sales User' };

    function singleAllocationDto() {
      return {
        items: [
          {
            productId: VALID_PRODUCT_ID,
            requestedQty: 10,
            unitPrice: 2,
            allocations: [{ warehouseId: VALID_WAREHOUSE_A, qty: 10 }],
          },
        ],
      };
    }

    it('throws NotFoundException when product is missing', async () => {
      productsService.findById.mockResolvedValue(null);

      await expect(
        service.create(singleAllocationDto(), soldBy),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when warehouse is missing', async () => {
      productsService.findById.mockResolvedValue(mockProduct);
      warehousesService.findById.mockResolvedValue(null);

      await expect(
        service.create(singleAllocationDto(), soldBy),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when warehouse is inactive', async () => {
      productsService.findById.mockResolvedValue(mockProduct);
      warehousesService.findById.mockResolvedValue({
        id: VALID_WAREHOUSE_A,
        name: 'Almacén X',
        isActive: false,
      });

      await expect(
        service.create(singleAllocationDto(), soldBy),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when stock is insufficient', async () => {
      productsService.findById.mockResolvedValue(mockProduct);
      warehousesService.findById.mockResolvedValue({
        id: VALID_WAREHOUSE_A,
        name: 'Almacén X',
        isActive: true,
      });
      inventoryService.findAvailableStock.mockResolvedValue(5);

      await expect(
        service.create(singleAllocationDto(), soldBy),
      ).rejects.toThrow(/Insufficient stock/);
      expect(inventoryService.create).not.toHaveBeenCalled();
    });

    it('aggregates stock requirements across multiple items hitting the same (productId, warehouseId)', async () => {
      productsService.findById.mockResolvedValue(mockProduct);
      warehousesService.findById.mockResolvedValue({
        id: VALID_WAREHOUSE_A,
        name: 'Almacén X',
        isActive: true,
      });
      // Two items, each requesting 30 from the same warehouse.
      // Stock is 50, so individually each passes (30 <= 50) but the
      // sum 60 should fail.
      inventoryService.findAvailableStock.mockResolvedValue(50);

      const dto = {
        items: [
          {
            productId: VALID_PRODUCT_ID,
            requestedQty: 30,
            unitPrice: 1.5,
            allocations: [{ warehouseId: VALID_WAREHOUSE_A, qty: 30 }],
          },
          {
            productId: VALID_PRODUCT_ID,
            requestedQty: 30,
            unitPrice: 1.5,
            allocations: [{ warehouseId: VALID_WAREHOUSE_A, qty: 30 }],
          },
        ],
      };

      await expect(service.create(dto, soldBy)).rejects.toThrow(
        /Insufficient stock/,
      );
      expect(inventoryService.create).not.toHaveBeenCalled();
    });

    it('creates outbound transactions for each allocation and inserts the sale', async () => {
      productsService.findById.mockResolvedValue(mockProduct);
      warehousesService.findById
        .mockResolvedValueOnce({
          id: VALID_WAREHOUSE_A,
          name: 'Almacén Caracas Norte',
          isActive: true,
        })
        .mockResolvedValueOnce({
          id: VALID_WAREHOUSE_B,
          name: 'Almacén Caracas Sur',
          isActive: true,
        });
      inventoryService.findAvailableStock.mockResolvedValue(100);
      saleModel.create.mockResolvedValue({ id: 'sale-1' });

      const dto = {
        customerName: 'Bodega Local',
        items: [
          {
            productId: VALID_PRODUCT_ID,
            requestedQty: 30,
            unitPrice: 1.5,
            allocations: [
              { warehouseId: VALID_WAREHOUSE_A, qty: 20 },
              { warehouseId: VALID_WAREHOUSE_B, qty: 10 },
            ],
          },
        ],
      };

      await service.create(dto, soldBy);

      expect(inventoryService.create).toHaveBeenCalledTimes(2);
      const [firstTx, firstCreatedBy, firstOpts] =
        inventoryService.create.mock.calls[0];
      expect(firstTx).toMatchObject({
        productId: VALID_PRODUCT_ID,
        warehouseId: VALID_WAREHOUSE_A,
        transactionType: 'outbound',
        qty: 20,
      });
      expect(firstCreatedBy).toEqual(soldBy);
      expect(firstOpts).toEqual({ skipValidation: true });

      expect(saleModel.create).toHaveBeenCalledTimes(1);
      const inserted = saleModel.create.mock.calls[0][0];
      expect(inserted.totalQty).toBe(30);
      expect(inserted.totalAmount).toBe(30 * 1.5);
      expect(inserted.currency).toBe('USD');
      expect(inserted.saleNumber).toMatch(/^S-\d{4}-00001$/);
    });

    it('retries the saleNumber generation on duplicate-key without re-running inventory writes', async () => {
      productsService.findById.mockResolvedValue(mockProduct);
      warehousesService.findById.mockResolvedValue({
        id: VALID_WAREHOUSE_A,
        name: 'Almacén X',
        isActive: true,
      });
      inventoryService.findAvailableStock.mockResolvedValue(100);

      const dupErr = Object.assign(new Error('duplicate'), { code: 11000 });
      saleModel.create
        .mockRejectedValueOnce(dupErr)
        .mockResolvedValueOnce({ id: 'sale-1', saleNumber: 'S-2026-00002' });

      await service.create(singleAllocationDto(), soldBy);

      // Sale.create called twice (one dup-key, one success)
      expect(saleModel.create).toHaveBeenCalledTimes(2);
      // Inventory.create called once per allocation, AFTER the sale persisted
      expect(inventoryService.create).toHaveBeenCalledTimes(1);
    });

    it('increments the sale-number sequence based on the last sale of the year', async () => {
      const year = new Date().getUTCFullYear();
      saleModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        select: jest
          .fn()
          .mockResolvedValue({ saleNumber: `S-${year}-00042` }),
      });
      productsService.findById.mockResolvedValue(mockProduct);
      warehousesService.findById.mockResolvedValue({
        id: VALID_WAREHOUSE_A,
        name: 'Almacén X',
        isActive: true,
      });
      inventoryService.findAvailableStock.mockResolvedValue(100);
      saleModel.create.mockResolvedValue({ id: 'sale-1' });

      await service.create(singleAllocationDto(), soldBy);

      const inserted = saleModel.create.mock.calls[0][0];
      expect(inserted.saleNumber).toBe(`S-${year}-00043`);
    });
  });

  describe('findAllPaginated', () => {
    it('returns paginated sales sorted by createdAt desc', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'sale-1' }]),
      };
      saleModel.find.mockReturnValue(chainable);
      saleModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(1, 10);

      expect(chainable.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual({ data: [{ id: 'sale-1' }], total: 1 });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when sale is missing', async () => {
      saleModel.findById.mockResolvedValue(null);

      await expect(service.remove('sale-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates inbound reversal transactions and deletes the sale', async () => {
      const sale = {
        id: 'sale-1',
        saleNumber: 'S-2026-00001',
        soldBy: { userId: 'user-1', name: 'Sales User' },
        items: [
          {
            productId: VALID_PRODUCT_ID,
            allocations: [
              { warehouseId: VALID_WAREHOUSE_A, qty: 20 },
              { warehouseId: VALID_WAREHOUSE_B, qty: 10 },
            ],
          },
        ],
      };
      saleModel.findById.mockResolvedValue(sale);

      await service.remove('sale-1');

      expect(inventoryService.create).toHaveBeenCalledTimes(2);
      const [firstTx] = inventoryService.create.mock.calls[0];
      expect(firstTx).toMatchObject({
        productId: VALID_PRODUCT_ID,
        warehouseId: VALID_WAREHOUSE_A,
        transactionType: 'inbound',
        qty: 20,
      });
      expect(saleModel.findByIdAndDelete).toHaveBeenCalledWith('sale-1');
    });
  });
});
