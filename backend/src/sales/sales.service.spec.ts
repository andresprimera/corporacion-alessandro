import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SalesService } from './sales.service';
import { Sale } from './schemas/sale.schema';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { InventoryService } from '../inventory/inventory.service';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';
import { CitiesService } from '../cities/cities.service';

describe('SalesService', () => {
  let service: SalesService;
  let saleModel: Record<string, jest.Mock>;

  const productsService = { findById: jest.fn() };
  const warehousesService = { findActiveByCity: jest.fn() };
  const inventoryService = {
    create: jest.fn(),
    findAvailableStock: jest.fn(),
    findCityStockForProduct: jest.fn(),
  };
  const clientsService = { findById: jest.fn() };
  const usersService = { findById: jest.fn() };
  const citiesService = { findById: jest.fn() };

  const VALID_PRODUCT_ID = '507f1f77bcf86cd799439011';
  const VALID_WAREHOUSE_A = '507f1f77bcf86cd799439021';
  const VALID_WAREHOUSE_B = '507f1f77bcf86cd799439022';
  const VALID_CLIENT_ID = '507f1f77bcf86cd799439031';
  const VALID_SALES_PERSON_ID = '507f1f77bcf86cd799439041';
  const OTHER_SALES_PERSON_ID = '507f1f77bcf86cd799439042';
  const VALID_CITY_ID = '507f1f77bcf86cd799439051';

  const mockProduct = {
    id: VALID_PRODUCT_ID,
    name: 'Harina PAN 1kg',
    kind: 'groceries',
    price: { value: 1.5, currency: 'USD' },
  };

  const mockClient = {
    id: VALID_CLIENT_ID,
    name: 'Bodega Local',
    salesPersonId: {
      _id: new Types.ObjectId(VALID_SALES_PERSON_ID),
      name: 'Sales User',
    },
  };

  const mockCity = {
    id: VALID_CITY_ID,
    name: 'Caracas',
    isActive: true,
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
        { provide: ClientsService, useValue: clientsService },
        { provide: UsersService, useValue: usersService },
        { provide: CitiesService, useValue: citiesService },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);

    saleModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(null),
    });

    clientsService.findById.mockResolvedValue(mockClient);
    citiesService.findById.mockResolvedValue(mockCity);
    productsService.findById.mockResolvedValue(mockProduct);
  });

  describe('create', () => {
    const soldBy = { userId: VALID_SALES_PERSON_ID, name: 'Sales User' };
    const adminActor = { role: 'admin' as const };
    const salesPersonActor = { role: 'salesPerson' as const };

    function dto(overrides: Partial<{
      cityId: string;
      requestedQty: number;
    }> = {}) {
      return {
        cityId: overrides.cityId ?? VALID_CITY_ID,
        clientId: VALID_CLIENT_ID,
        items: [
          {
            productId: VALID_PRODUCT_ID,
            requestedQty: overrides.requestedQty ?? 10,
            unitPrice: 2,
          },
        ],
      };
    }

    describe('city resolution — sales-person actor', () => {
      it('uses the sales-person user.cityId', async () => {
        usersService.findById.mockResolvedValue({
          id: VALID_SALES_PERSON_ID,
          cityId: new Types.ObjectId(VALID_CITY_ID),
        });
        warehousesService.findActiveByCity.mockResolvedValue([
          { id: VALID_WAREHOUSE_A, name: 'A' },
        ]);
        inventoryService.findCityStockForProduct.mockResolvedValue(100);
        inventoryService.findAvailableStock.mockResolvedValue(100);
        saleModel.create.mockResolvedValue({ id: 'sale-1' });

        await service.create(
          { ...dto(), cityId: undefined },
          soldBy,
          salesPersonActor,
        );

        expect(usersService.findById).toHaveBeenCalledWith(
          VALID_SALES_PERSON_ID,
        );
        expect(citiesService.findById).toHaveBeenCalledWith(VALID_CITY_ID);
      });

      it('throws BadRequestException when sales-person has no cityId', async () => {
        usersService.findById.mockResolvedValue({
          id: VALID_SALES_PERSON_ID,
          cityId: undefined,
        });

        await expect(
          service.create({ ...dto(), cityId: undefined }, soldBy, salesPersonActor),
        ).rejects.toThrow(/no assigned city/);
      });
    });

    describe('city resolution — admin actor', () => {
      it('throws BadRequestException when dto.cityId is missing', async () => {
        await expect(
          service.create({ ...dto(), cityId: undefined }, soldBy, adminActor),
        ).rejects.toThrow(/City is required/);
      });

      it('uses dto.cityId', async () => {
        warehousesService.findActiveByCity.mockResolvedValue([
          { id: VALID_WAREHOUSE_A, name: 'A' },
        ]);
        inventoryService.findCityStockForProduct.mockResolvedValue(100);
        inventoryService.findAvailableStock.mockResolvedValue(100);
        saleModel.create.mockResolvedValue({ id: 'sale-1' });

        await service.create(dto(), soldBy, adminActor);

        expect(usersService.findById).not.toHaveBeenCalled();
        expect(citiesService.findById).toHaveBeenCalledWith(VALID_CITY_ID);
      });
    });

    it('throws NotFoundException when city does not exist', async () => {
      citiesService.findById.mockResolvedValue(null);

      await expect(service.create(dto(), soldBy, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when city is inactive', async () => {
      citiesService.findById.mockResolvedValue({ ...mockCity, isActive: false });

      await expect(service.create(dto(), soldBy, adminActor)).rejects.toThrow(
        /inactive/,
      );
    });

    it('throws NotFoundException when product is missing', async () => {
      productsService.findById.mockResolvedValue(null);

      await expect(service.create(dto(), soldBy, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException with city name when city stock is insufficient', async () => {
      inventoryService.findCityStockForProduct.mockResolvedValue(5);

      await expect(
        service.create(dto({ requestedQty: 10 }), soldBy, adminActor),
      ).rejects.toThrow(/Insufficient stock.+Caracas/);
      expect(inventoryService.create).not.toHaveBeenCalled();
    });

    it('aggregates duplicate productIds across items before checking stock', async () => {
      inventoryService.findCityStockForProduct.mockResolvedValue(50);

      const reqDto = {
        cityId: VALID_CITY_ID,
        clientId: VALID_CLIENT_ID,
        items: [
          { productId: VALID_PRODUCT_ID, requestedQty: 30, unitPrice: 1.5 },
          { productId: VALID_PRODUCT_ID, requestedQty: 30, unitPrice: 1.5 },
        ],
      };

      await expect(service.create(reqDto, soldBy, adminActor)).rejects.toThrow(
        /Insufficient stock/,
      );
    });

    it('auto-allocates by stock-desc, name-asc tiebreaker, depleting largest pocket first', async () => {
      // Three warehouses: A=20, B=80, C=80. Order should be B,C,A. Request 90 → B(80) + C(10).
      warehousesService.findActiveByCity.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'C-Almacen' },
        { id: VALID_WAREHOUSE_B, name: 'A-Almacen' },
        { id: '507f1f77bcf86cd799439023', name: 'B-Almacen' },
      ]);
      inventoryService.findCityStockForProduct.mockResolvedValue(180);
      inventoryService.findAvailableStock.mockImplementation(
        async (_p: string, w: string) => {
          if (w === VALID_WAREHOUSE_A) return 20;
          if (w === VALID_WAREHOUSE_B) return 80;
          return 80;
        },
      );
      saleModel.create.mockResolvedValue({ id: 'sale-1', saleNumber: 'S-X-00001' });

      await service.create(dto({ requestedQty: 90 }), soldBy, adminActor);

      const inserted = saleModel.create.mock.calls[0][0];
      const allocations = inserted.items[0].allocations;
      // First taken from B-Almacen (80), then C-Almacen (10).
      expect(allocations).toHaveLength(2);
      expect(allocations[0].warehouseName).toBe('A-Almacen');
      expect(allocations[0].qty).toBe(80);
      expect(allocations[1].warehouseName).toBe('B-Almacen');
      expect(allocations[1].qty).toBe(10);
    });

    it('skips warehouses with zero stock during auto-allocation', async () => {
      warehousesService.findActiveByCity.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
        { id: VALID_WAREHOUSE_B, name: 'B' },
      ]);
      inventoryService.findCityStockForProduct.mockResolvedValue(50);
      inventoryService.findAvailableStock.mockImplementation(
        async (_p: string, w: string) => (w === VALID_WAREHOUSE_A ? 0 : 50),
      );
      saleModel.create.mockResolvedValue({ id: 'sale-1', saleNumber: 'S-X-00001' });

      await service.create(dto({ requestedQty: 30 }), soldBy, adminActor);

      const inserted = saleModel.create.mock.calls[0][0];
      const allocations = inserted.items[0].allocations;
      expect(allocations).toHaveLength(1);
      expect(allocations[0].warehouseName).toBe('B');
      expect(allocations[0].qty).toBe(30);
    });

    it('persists cityId and cityName on the sale', async () => {
      warehousesService.findActiveByCity.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
      ]);
      inventoryService.findCityStockForProduct.mockResolvedValue(100);
      inventoryService.findAvailableStock.mockResolvedValue(100);
      saleModel.create.mockResolvedValue({ id: 'sale-1' });

      await service.create(dto(), soldBy, adminActor);

      const inserted = saleModel.create.mock.calls[0][0];
      expect(inserted.cityId.toString()).toBe(VALID_CITY_ID);
      expect(inserted.cityName).toBe('Caracas');
    });

    it('emits one outbound transaction per allocation', async () => {
      warehousesService.findActiveByCity.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
        { id: VALID_WAREHOUSE_B, name: 'B' },
      ]);
      inventoryService.findCityStockForProduct.mockResolvedValue(100);
      inventoryService.findAvailableStock.mockImplementation(
        async (_p: string, w: string) => (w === VALID_WAREHOUSE_A ? 30 : 30),
      );
      saleModel.create.mockResolvedValue({
        id: 'sale-1',
        saleNumber: 'S-2026-00001',
      });

      await service.create(dto({ requestedQty: 50 }), soldBy, adminActor);

      expect(inventoryService.create).toHaveBeenCalledTimes(2);
      const calls = inventoryService.create.mock.calls;
      expect(calls[0][0]).toMatchObject({
        productId: VALID_PRODUCT_ID,
        transactionType: 'outbound',
      });
      expect(calls[0][2]).toEqual({ skipValidation: true });
    });

    it('throws NotFoundException when client is missing', async () => {
      clientsService.findById.mockResolvedValue(null);

      await expect(service.create(dto(), soldBy, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ForbiddenException when sales-person uses another sales person's client", async () => {
      usersService.findById.mockResolvedValue({
        id: VALID_SALES_PERSON_ID,
        cityId: new Types.ObjectId(VALID_CITY_ID),
      });
      clientsService.findById.mockResolvedValue({
        ...mockClient,
        salesPersonId: {
          _id: new Types.ObjectId(OTHER_SALES_PERSON_ID),
          name: 'Other Sales User',
        },
      });

      await expect(
        service.create({ ...dto(), cityId: undefined }, soldBy, salesPersonActor),
      ).rejects.toThrow(/another sales person/);
      expect(saleModel.create).not.toHaveBeenCalled();
    });

    it('retries the saleNumber generation on duplicate-key without re-running inventory writes', async () => {
      warehousesService.findActiveByCity.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
      ]);
      inventoryService.findCityStockForProduct.mockResolvedValue(100);
      inventoryService.findAvailableStock.mockResolvedValue(100);

      const dupErr = Object.assign(new Error('duplicate'), { code: 11000 });
      saleModel.create
        .mockRejectedValueOnce(dupErr)
        .mockResolvedValueOnce({ id: 'sale-1', saleNumber: 'S-2026-00002' });

      await service.create(dto(), soldBy, adminActor);

      expect(saleModel.create).toHaveBeenCalledTimes(2);
      expect(inventoryService.create).toHaveBeenCalledTimes(1);
    });

    it('increments the sale-number sequence based on the last sale of the year', async () => {
      const year = new Date().getUTCFullYear();
      saleModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ saleNumber: `S-${year}-00042` }),
      });
      warehousesService.findActiveByCity.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
      ]);
      inventoryService.findCityStockForProduct.mockResolvedValue(100);
      inventoryService.findAvailableStock.mockResolvedValue(100);
      saleModel.create.mockResolvedValue({ id: 'sale-1' });

      await service.create(dto(), soldBy, adminActor);

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
