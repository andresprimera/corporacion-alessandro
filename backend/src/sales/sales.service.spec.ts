import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { SalesService } from './sales.service';
import { Sale } from './schemas/sale.schema';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { InventoryService } from '../inventory/inventory.service';
import { ClientsService } from '../clients/clients.service';
import { StorageService } from '../services/storage/storage.service';

describe('SalesService', () => {
  let service: SalesService;
  let saleModel: Record<string, jest.Mock>;

  const productsService = { findById: jest.fn() };
  const warehousesService = { findAllActive: jest.fn() };
  const inventoryService = {
    create: jest.fn(),
    findAvailableStock: jest.fn(),
    findTotalStockForProduct: jest.fn(),
  };
  const clientsService = { findById: jest.fn() };
  const configService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };
  const storageService = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
  };

  const VALID_PRODUCT_ID = '507f1f77bcf86cd799439011';
  const VALID_WAREHOUSE_A = '507f1f77bcf86cd799439021';
  const VALID_WAREHOUSE_B = '507f1f77bcf86cd799439022';
  const VALID_CLIENT_ID = '507f1f77bcf86cd799439031';
  const VALID_SALES_PERSON_ID = '507f1f77bcf86cd799439041';
  const OTHER_SALES_PERSON_ID = '507f1f77bcf86cd799439042';
  const VALID_CITY_ID = '507f1f77bcf86cd799439051';
  const BASIC_UNIT_ID = '507f1f77bcf86cd799439071';
  const PACKAGE_UNIT_ID = '507f1f77bcf86cd799439072';

  const mockProduct = {
    id: VALID_PRODUCT_ID,
    name: 'Harina PAN 1kg',
    kind: 'groceries',
    price: { value: 1.5, currency: 'USD' },
    basicUnitId: {
      _id: new Types.ObjectId(BASIC_UNIT_ID),
      name: 'Unidad',
      abbreviation: 'und',
    },
    packageUnitId: {
      _id: new Types.ObjectId(PACKAGE_UNIT_ID),
      name: 'Caja',
      abbreviation: 'cja',
    },
    unitsPerPackage: 12,
  };

  const mockClient = {
    id: VALID_CLIENT_ID,
    name: 'Bodega Local',
    salesPersonId: {
      _id: new Types.ObjectId(VALID_SALES_PERSON_ID),
      name: 'Sales User',
    },
    cityId: {
      _id: new Types.ObjectId(VALID_CITY_ID),
      name: 'Caracas',
    },
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
      exists: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getModelToken(Sale.name), useValue: saleModel },
        { provide: ProductsService, useValue: productsService },
        { provide: WarehousesService, useValue: warehousesService },
        { provide: InventoryService, useValue: inventoryService },
        { provide: ClientsService, useValue: clientsService },
        { provide: ConfigService, useValue: configService },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);

    saleModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(null),
    });

    clientsService.findById.mockResolvedValue(mockClient);
    productsService.findById.mockResolvedValue(mockProduct);
  });

  describe('create', () => {
    const soldBy = { userId: VALID_SALES_PERSON_ID, name: 'Sales User' };
    const adminActor = { role: 'admin' as const };
    const salesPersonActor = { role: 'salesPerson' as const };

    function dto(
      overrides: Partial<{
        enteredQty: number;
        enteredUnitId: string;
        unitPrice: number;
      }> = {},
    ) {
      return {
        clientId: VALID_CLIENT_ID,
        items: [
          {
            productId: VALID_PRODUCT_ID,
            enteredQty: overrides.enteredQty ?? 10,
            enteredUnitId: overrides.enteredUnitId ?? BASIC_UNIT_ID,
            unitPrice: overrides.unitPrice ?? 2,
          },
        ],
      };
    }

    it('throws NotFoundException when client is missing', async () => {
      clientsService.findById.mockResolvedValue(null);

      await expect(service.create(dto(), soldBy, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ForbiddenException when sales-person uses another sales person's client", async () => {
      clientsService.findById.mockResolvedValue({
        ...mockClient,
        salesPersonId: {
          _id: new Types.ObjectId(OTHER_SALES_PERSON_ID),
          name: 'Other Sales User',
        },
      });

      await expect(
        service.create(dto(), soldBy, salesPersonActor),
      ).rejects.toThrow(/another sales person/);
      expect(saleModel.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the client already has a pending sale', async () => {
      saleModel.exists.mockResolvedValue({ _id: new Types.ObjectId() });

      await expect(service.create(dto(), soldBy, adminActor)).rejects.toThrow(
        BadRequestException,
      );

      const [pendingFilter] = saleModel.exists.mock.calls[0];
      expect(pendingFilter.clientId).toBeInstanceOf(Types.ObjectId);
      expect(String(pendingFilter.clientId)).toBe(VALID_CLIENT_ID);
      expect(pendingFilter.status).toEqual({ $in: ['placed', 'paid'] });
      expect(productsService.findById).not.toHaveBeenCalled();
      expect(inventoryService.create).not.toHaveBeenCalled();
      expect(saleModel.create).not.toHaveBeenCalled();
    });

    it('proceeds when the client has no pending sale', async () => {
      saleModel.exists.mockResolvedValue(null);
      warehousesService.findAllActive.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
      ]);
      inventoryService.findTotalStockForProduct.mockResolvedValue(100);
      inventoryService.findAvailableStock.mockResolvedValue(100);
      saleModel.create.mockResolvedValue({
        id: 'sale-1',
        saleNumber: 'S-2026-00001',
      });

      await service.create(dto(), soldBy, adminActor);

      expect(saleModel.exists).toHaveBeenCalledTimes(1);
      expect(saleModel.create).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when product is missing', async () => {
      productsService.findById.mockResolvedValue(null);

      await expect(service.create(dto(), soldBy, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when total stock is insufficient', async () => {
      inventoryService.findTotalStockForProduct.mockResolvedValue(5);

      await expect(
        service.create(dto({ enteredQty: 10 }), soldBy, adminActor),
      ).rejects.toThrow(/Insufficient stock/);
      expect(inventoryService.create).not.toHaveBeenCalled();
    });

    it('aggregates duplicate productIds across items before checking stock', async () => {
      inventoryService.findTotalStockForProduct.mockResolvedValue(50);

      const reqDto = {
        clientId: VALID_CLIENT_ID,
        items: [
          {
            productId: VALID_PRODUCT_ID,
            enteredQty: 30,
            enteredUnitId: BASIC_UNIT_ID,
            unitPrice: 1.5,
          },
          {
            productId: VALID_PRODUCT_ID,
            enteredQty: 30,
            enteredUnitId: BASIC_UNIT_ID,
            unitPrice: 1.5,
          },
        ],
      };

      await expect(service.create(reqDto, soldBy, adminActor)).rejects.toThrow(
        /Insufficient stock/,
      );
    });

    it('throws BadRequestException when enteredUnitId does not belong to the product', async () => {
      await expect(
        service.create(
          dto({ enteredUnitId: '507f1f77bcf86cd799439099' }),
          soldBy,
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('converts enteredQty in package units to basic-unit requestedQty', async () => {
      warehousesService.findAllActive.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
      ]);
      inventoryService.findTotalStockForProduct.mockResolvedValue(100);
      inventoryService.findAvailableStock.mockResolvedValue(100);
      saleModel.create.mockResolvedValue({ id: 'sale-1' });

      // 2 Caja × 12 = 24 basic units
      await service.create(
        dto({ enteredQty: 2, enteredUnitId: PACKAGE_UNIT_ID }),
        soldBy,
        adminActor,
      );

      const inserted = saleModel.create.mock.calls[0][0];
      expect(inserted.items[0].requestedQty).toBe(24);
      expect(inserted.items[0].enteredQty).toBe(2);
      expect(inserted.items[0].enteredUnit.name).toBe('Caja');
      expect(inserted.items[0].enteredUnit.abbreviation).toBe('cja');
      expect(inserted.items[0].unitsPerPackageAtEntry).toBe(12);
    });

    it('snapshots the basic unit on the sale item when entered by basic unit', async () => {
      warehousesService.findAllActive.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
      ]);
      inventoryService.findTotalStockForProduct.mockResolvedValue(100);
      inventoryService.findAvailableStock.mockResolvedValue(100);
      saleModel.create.mockResolvedValue({ id: 'sale-1' });

      await service.create(dto({ enteredQty: 5 }), soldBy, adminActor);

      const inserted = saleModel.create.mock.calls[0][0];
      expect(inserted.items[0].requestedQty).toBe(5);
      expect(inserted.items[0].enteredQty).toBe(5);
      expect(inserted.items[0].enteredUnit.name).toBe('Unidad');
      expect(inserted.items[0].unitsPerPackageAtEntry).toBeUndefined();
    });

    it('auto-allocates by stock-desc, name-asc tiebreaker, depleting largest pocket first', async () => {
      warehousesService.findAllActive.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'C-Almacen' },
        { id: VALID_WAREHOUSE_B, name: 'A-Almacen' },
        { id: '507f1f77bcf86cd799439023', name: 'B-Almacen' },
      ]);
      inventoryService.findTotalStockForProduct.mockResolvedValue(180);
      inventoryService.findAvailableStock.mockImplementation(
        async (_p: string, w: string) => {
          if (w === VALID_WAREHOUSE_A) return 20;
          if (w === VALID_WAREHOUSE_B) return 80;
          return 80;
        },
      );
      saleModel.create.mockResolvedValue({
        id: 'sale-1',
        saleNumber: 'S-X-00001',
      });

      await service.create(dto({ enteredQty: 90 }), soldBy, adminActor);

      const inserted = saleModel.create.mock.calls[0][0];
      const allocations = inserted.items[0].allocations;
      expect(allocations).toHaveLength(2);
      expect(allocations[0].warehouseName).toBe('A-Almacen');
      expect(allocations[0].qty).toBe(80);
      expect(allocations[1].warehouseName).toBe('B-Almacen');
      expect(allocations[1].qty).toBe(10);
    });

    it('skips warehouses with zero stock during auto-allocation', async () => {
      warehousesService.findAllActive.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
        { id: VALID_WAREHOUSE_B, name: 'B' },
      ]);
      inventoryService.findTotalStockForProduct.mockResolvedValue(50);
      inventoryService.findAvailableStock.mockImplementation(
        async (_p: string, w: string) => (w === VALID_WAREHOUSE_A ? 0 : 50),
      );
      saleModel.create.mockResolvedValue({
        id: 'sale-1',
        saleNumber: 'S-X-00001',
      });

      await service.create(dto({ enteredQty: 30 }), soldBy, adminActor);

      const inserted = saleModel.create.mock.calls[0][0];
      const allocations = inserted.items[0].allocations;
      expect(allocations).toHaveLength(1);
      expect(allocations[0].warehouseName).toBe('B');
      expect(allocations[0].qty).toBe(30);
    });

    it('persists clientId and clientName on the sale (no city fields)', async () => {
      warehousesService.findAllActive.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
      ]);
      inventoryService.findTotalStockForProduct.mockResolvedValue(100);
      inventoryService.findAvailableStock.mockResolvedValue(100);
      saleModel.create.mockResolvedValue({ id: 'sale-1' });

      await service.create(dto(), soldBy, adminActor);

      const inserted = saleModel.create.mock.calls[0][0];
      expect(inserted.clientId.toString()).toBe(VALID_CLIENT_ID);
      expect(inserted.clientName).toBe('Bodega Local');
      expect(inserted.cityId).toBeUndefined();
      expect(inserted.cityName).toBeUndefined();
    });

    it('emits one outbound transaction per allocation', async () => {
      warehousesService.findAllActive.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
        { id: VALID_WAREHOUSE_B, name: 'B' },
      ]);
      inventoryService.findTotalStockForProduct.mockResolvedValue(100);
      inventoryService.findAvailableStock.mockImplementation(
        async (_p: string, w: string) => (w === VALID_WAREHOUSE_A ? 30 : 30),
      );
      saleModel.create.mockResolvedValue({
        id: 'sale-1',
        saleNumber: 'S-2026-00001',
      });

      await service.create(dto({ enteredQty: 50 }), soldBy, adminActor);

      expect(inventoryService.create).toHaveBeenCalledTimes(2);
      const calls = inventoryService.create.mock.calls;
      expect(calls[0][0]).toMatchObject({
        productId: VALID_PRODUCT_ID,
        transactionType: 'outbound',
      });
      expect(calls[0][2]).toEqual({ skipValidation: true });
    });

    it('retries the saleNumber generation on duplicate-key without re-running inventory writes', async () => {
      warehousesService.findAllActive.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
      ]);
      inventoryService.findTotalStockForProduct.mockResolvedValue(100);
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
      warehousesService.findAllActive.mockResolvedValue([
        { id: VALID_WAREHOUSE_A, name: 'A' },
      ]);
      inventoryService.findTotalStockForProduct.mockResolvedValue(100);
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

    it('queries without a soldBy.userId filter when opts is absent', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      saleModel.find.mockReturnValue(chainable);
      saleModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(1, 10);

      expect(saleModel.find).toHaveBeenCalledWith({});
      expect(saleModel.countDocuments).toHaveBeenCalledWith({});
    });

    it('applies soldBy.userId filter when opts.soldByUserId is provided', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'sale-1' }]),
      };
      saleModel.find.mockReturnValue(chainable);
      saleModel.countDocuments.mockResolvedValue(1);

      await service.findAllPaginated(1, 10, {
        soldByUserId: VALID_SALES_PERSON_ID,
      });

      expect(saleModel.find).toHaveBeenCalledWith({
        'soldBy.userId': VALID_SALES_PERSON_ID,
      });
      expect(saleModel.countDocuments).toHaveBeenCalledWith({
        'soldBy.userId': VALID_SALES_PERSON_ID,
      });
    });

    it('applies delivered: { $ne: true } when excludeDelivered is true', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      saleModel.find.mockReturnValue(chainable);
      saleModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(1, 10, {
        soldByUserId: VALID_SALES_PERSON_ID,
        excludeDelivered: true,
      });

      expect(saleModel.find).toHaveBeenCalledWith({
        'soldBy.userId': VALID_SALES_PERSON_ID,
        delivered: { $ne: true },
      });
      expect(saleModel.countDocuments).toHaveBeenCalledWith({
        'soldBy.userId': VALID_SALES_PERSON_ID,
        delivered: { $ne: true },
      });
    });

    it('does not apply delivered filter when excludeDelivered is false', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      saleModel.find.mockReturnValue(chainable);
      saleModel.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(1, 10, { excludeDelivered: false });

      expect(saleModel.find).toHaveBeenCalledWith({});
      expect(saleModel.countDocuments).toHaveBeenCalledWith({});
    });
  });

  describe('markDelivered', () => {
    const VALID_SALE_ID = '507f1f77bcf86cd799439061';

    it('throws NotFoundException when the sale does not exist', async () => {
      saleModel.findById.mockResolvedValue(null);

      await expect(service.markDelivered(VALID_SALE_ID, true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when the sale is already delivered', async () => {
      saleModel.findById.mockResolvedValue({
        saleNumber: 'S-2026-00001',
        delivered: true,
      });

      await expect(service.markDelivered(VALID_SALE_ID, true)).rejects.toThrow(
        BadRequestException,
      );
      expect(saleModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('updates delivered=true via findByIdAndUpdate (skipping doc validation)', async () => {
      saleModel.findById.mockResolvedValue({
        saleNumber: 'S-2026-00001',
        delivered: false,
      });
      const updated = { saleNumber: 'S-2026-00001', delivered: true };
      saleModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.markDelivered(VALID_SALE_ID, true);

      expect(saleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_SALE_ID,
        { delivered: true },
        { new: true },
      );
      expect(result).toBe(updated);
    });
  });

  describe('PDF generation', () => {
    const VALID_SALE_ID = '507f1f77bcf86cd799439061';

    function buildSaleDoc(overrides: Partial<{ soldByUserId: string }> = {}) {
      return {
        id: VALID_SALE_ID,
        saleNumber: 'S-2026-00001',
        clientId: new Types.ObjectId(VALID_CLIENT_ID),
        clientName: 'Bodega Local',
        notes: undefined,
        items: [
          {
            productId: new Types.ObjectId(VALID_PRODUCT_ID),
            productName: 'Harina PAN 1kg',
            productKind: 'groceries',
            requestedQty: 5,
            unitPrice: 2,
            currency: 'USD',
            allocations: [
              {
                warehouseId: new Types.ObjectId(VALID_WAREHOUSE_A),
                warehouseName: 'Almacén Caracas',
                qty: 5,
              },
            ],
          },
        ],
        totalQty: 5,
        totalAmount: 10,
        currency: 'USD',
        soldBy: {
          userId: overrides.soldByUserId ?? VALID_SALES_PERSON_ID,
          name: 'Sales User',
        },
        get: (key: string) =>
          key === 'createdAt' ? new Date('2026-04-29T00:00:00Z') : undefined,
      };
    }

    beforeEach(() => {
      configService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'COMPANY_NAME') return 'Corporación Alessandro';
        if (key === 'COMPANY_RIF') return '000.000.000-0';
        return '';
      });
      configService.get.mockReturnValue('');
    });

    describe('generateDeliveryOrderPdf', () => {
      it('returns a PDF buffer for an admin', async () => {
        saleModel.findById.mockResolvedValue(buildSaleDoc());

        const result = await service.generateDeliveryOrderPdf(VALID_SALE_ID, {
          userId: 'someone-else',
          role: 'admin',
        });

        expect(result.filename).toBe('orden-entrega-S-2026-00001.pdf');
        expect(Buffer.isBuffer(result.buffer)).toBe(true);
        expect(result.buffer.length).toBeGreaterThan(0);
        expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
      });

      it('returns a PDF for the salesperson who created the sale', async () => {
        saleModel.findById.mockResolvedValue(buildSaleDoc());

        const result = await service.generateDeliveryOrderPdf(VALID_SALE_ID, {
          userId: VALID_SALES_PERSON_ID,
          role: 'salesPerson',
        });

        expect(Buffer.isBuffer(result.buffer)).toBe(true);
      });

      it('throws ForbiddenException when another salesperson tries', async () => {
        saleModel.findById.mockResolvedValue(buildSaleDoc());

        await expect(
          service.generateDeliveryOrderPdf(VALID_SALE_ID, {
            userId: OTHER_SALES_PERSON_ID,
            role: 'salesPerson',
          }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('throws NotFoundException when the sale does not exist', async () => {
        saleModel.findById.mockResolvedValue(null);

        await expect(
          service.generateDeliveryOrderPdf(VALID_SALE_ID, {
            userId: VALID_SALES_PERSON_ID,
            role: 'admin',
          }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('generateInvoicePdf', () => {
      const fullClient = {
        id: VALID_CLIENT_ID,
        name: 'Bodega Local',
        rif: '123.456.789-0',
        address: 'Av. Principal',
        phone: '0212-1234567',
        cityId: {
          _id: new Types.ObjectId(VALID_CITY_ID),
          name: 'Caracas',
        },
      };

      it('returns a PDF buffer for an admin', async () => {
        saleModel.findById.mockResolvedValue(buildSaleDoc());
        clientsService.findById.mockResolvedValue(fullClient);

        const result = await service.generateInvoicePdf(VALID_SALE_ID, {
          userId: 'admin-id',
          role: 'admin',
        });

        expect(result.filename).toBe('factura-S-2026-00001.pdf');
        expect(Buffer.isBuffer(result.buffer)).toBe(true);
        expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
      });

      it('throws NotFoundException when the client is missing', async () => {
        saleModel.findById.mockResolvedValue(buildSaleDoc());
        clientsService.findById.mockResolvedValue(null);

        await expect(
          service.generateInvoicePdf(VALID_SALE_ID, {
            userId: 'admin-id',
            role: 'admin',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('throws ForbiddenException when another salesperson tries', async () => {
        saleModel.findById.mockResolvedValue(buildSaleDoc());

        await expect(
          service.generateInvoicePdf(VALID_SALE_ID, {
            userId: OTHER_SALES_PERSON_ID,
            role: 'salesPerson',
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('updateStatus', () => {
    const SALE_ID = '507f1f77bcf86cd799439061';

    function buildSale(overrides: Partial<{ status: string }> = {}) {
      return {
        id: SALE_ID,
        saleNumber: 'S-2026-00001',
        status: overrides.status ?? 'paid',
        save: jest.fn().mockImplementation(function (this: { status: string }) {
          return Promise.resolve(this);
        }),
      };
    }

    it('transitions paid → confirmed', async () => {
      const sale = buildSale({ status: 'paid' });
      saleModel.findById.mockResolvedValue(sale);

      await service.updateStatus(SALE_ID, 'confirmed');

      expect(sale.status).toBe('confirmed');
      expect(sale.save).toHaveBeenCalledTimes(1);
    });

    it('transitions paid → payment_rejected', async () => {
      const sale = buildSale({ status: 'paid' });
      saleModel.findById.mockResolvedValue(sale);

      await service.updateStatus(SALE_ID, 'payment_rejected');

      expect(sale.status).toBe('payment_rejected');
    });

    it('throws BadRequestException when current is placed', async () => {
      const sale = buildSale({ status: 'placed' });
      saleModel.findById.mockResolvedValue(sale);

      await expect(
        service.updateStatus(SALE_ID, 'confirmed'),
      ).rejects.toThrow(BadRequestException);
      expect(sale.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when current is confirmed (terminal)', async () => {
      const sale = buildSale({ status: 'confirmed' });
      saleModel.findById.mockResolvedValue(sale);

      await expect(
        service.updateStatus(SALE_ID, 'payment_rejected'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when current is payment_rejected', async () => {
      const sale = buildSale({ status: 'payment_rejected' });
      saleModel.findById.mockResolvedValue(sale);

      await expect(
        service.updateStatus(SALE_ID, 'confirmed'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the sale does not exist', async () => {
      saleModel.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus(SALE_ID, 'confirmed'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitPayment', () => {
    const SALE_ID = '507f1f77bcf86cd799439061';

    function buildSale(
      overrides: Partial<{
        status: string;
        soldByUserId: string;
        paymentProof: { imageKey: string } | undefined;
      }> = {},
    ) {
      return {
        id: SALE_ID,
        saleNumber: 'S-2026-00001',
        status: overrides.status ?? 'placed',
        soldBy: {
          userId: overrides.soldByUserId ?? VALID_SALES_PERSON_ID,
          name: 'Sales User',
        },
        paymentProof: overrides.paymentProof,
        save: jest.fn().mockImplementation(function (this: unknown) {
          return Promise.resolve(this);
        }),
      } as unknown as {
        id: string;
        saleNumber: string;
        status: string;
        soldBy: { userId: string; name: string };
        paymentProof?: unknown;
        save: jest.Mock;
      };
    }

    function buildFile(
      overrides: Partial<{ mimetype: string; size: number }> = {},
    ): Express.Multer.File {
      return {
        buffer: Buffer.from('fake-bytes'),
        mimetype: overrides.mimetype ?? 'image/png',
        originalname: 'proof.png',
        size: overrides.size ?? 1024,
      } as Express.Multer.File;
    }

    const dto = {
      bank: 'Banco de Venezuela',
      paymentType: 'pago_movil' as const,
      paymentNumber: 'TX-12345',
      paymentDate: '2026-05-11',
      paidAmount: 100,
    };

    beforeEach(() => {
      storageService.upload.mockResolvedValue({
        key: 'sales/abc/payment-proofs/uuid-123.png',
        fileName: '123.png',
        url: '/uploads/sales/abc/payment-proofs/uuid-123.png',
        size: 1024,
        mimeType: 'image/png',
      });
    });

    it('uploads the proof and transitions placed → paid for the owner salesperson', async () => {
      const sale = buildSale({ status: 'placed' });
      saleModel.findById.mockResolvedValue(sale);

      const result = await service.submitPayment(SALE_ID, buildFile(), dto, {
        userId: VALID_SALES_PERSON_ID,
      });

      expect(storageService.upload).toHaveBeenCalledTimes(1);
      const [, opts] = storageService.upload.mock.calls[0];
      expect(opts.folder).toBe(`sales/${SALE_ID}/payment-proofs`);
      expect(opts.mimeType).toBe('image/png');
      expect(sale.status).toBe('paid');
      expect(
        (sale.paymentProof as { imageKey: string } | undefined)?.imageKey,
      ).toBe('sales/abc/payment-proofs/uuid-123.png');
      expect(
        (sale.paymentProof as { bank: string } | undefined)?.bank,
      ).toBe('Banco de Venezuela');
      expect(
        (sale.paymentProof as { paymentType: string } | undefined)?.paymentType,
      ).toBe('pago_movil');
      expect(
        (sale.paymentProof as { paymentNumber: string } | undefined)
          ?.paymentNumber,
      ).toBe('TX-12345');
      expect(
        (sale.paymentProof as { paidAmount: number } | undefined)?.paidAmount,
      ).toBe(100);
      expect(sale.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(sale);
    });

    it('deletes the previous proof and re-uploads on payment_rejected → paid', async () => {
      const sale = buildSale({
        status: 'payment_rejected',
        paymentProof: { imageKey: 'sales/abc/payment-proofs/old-key.png' },
      });
      saleModel.findById.mockResolvedValue(sale);

      await service.submitPayment(SALE_ID, buildFile(), dto, {
        userId: VALID_SALES_PERSON_ID,
      });

      expect(storageService.delete).toHaveBeenCalledWith(
        'sales/abc/payment-proofs/old-key.png',
      );
      expect(storageService.upload).toHaveBeenCalledTimes(1);
      expect(sale.status).toBe('paid');
    });

    it('swallows errors from the previous-proof delete but still uploads', async () => {
      const sale = buildSale({
        status: 'payment_rejected',
        paymentProof: { imageKey: 'orphaned-key' },
      });
      saleModel.findById.mockResolvedValue(sale);
      storageService.delete.mockRejectedValueOnce(new Error('not found'));

      await service.submitPayment(SALE_ID, buildFile(), dto, {
        userId: VALID_SALES_PERSON_ID,
      });

      expect(storageService.upload).toHaveBeenCalledTimes(1);
      expect(sale.status).toBe('paid');
    });

    it('throws ForbiddenException when the actor is not the owner', async () => {
      const sale = buildSale({ status: 'placed' });
      saleModel.findById.mockResolvedValue(sale);

      await expect(
        service.submitPayment(SALE_ID, buildFile(), dto, {
          userId: OTHER_SALES_PERSON_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(storageService.upload).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when status is paid (already submitted)', async () => {
      const sale = buildSale({ status: 'paid' });
      saleModel.findById.mockResolvedValue(sale);

      await expect(
        service.submitPayment(SALE_ID, buildFile(), dto, {
          userId: VALID_SALES_PERSON_ID,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(storageService.upload).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when status is confirmed', async () => {
      const sale = buildSale({ status: 'confirmed' });
      saleModel.findById.mockResolvedValue(sale);

      await expect(
        service.submitPayment(SALE_ID, buildFile(), dto, {
          userId: VALID_SALES_PERSON_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the sale does not exist', async () => {
      saleModel.findById.mockResolvedValue(null);

      await expect(
        service.submitPayment(SALE_ID, buildFile(), dto, {
          userId: VALID_SALES_PERSON_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findPaymentProofStream', () => {
    const SALE_ID = '507f1f77bcf86cd799439061';

    function buildSale(
      overrides: Partial<{
        soldByUserId: string;
        paymentProof: unknown;
      }> = {},
    ) {
      return {
        id: SALE_ID,
        saleNumber: 'S-2026-00001',
        soldBy: {
          userId: overrides.soldByUserId ?? VALID_SALES_PERSON_ID,
          name: 'Sales User',
        },
        paymentProof:
          'paymentProof' in overrides
            ? overrides.paymentProof
            : {
                imageKey: 'sales/abc/payment-proofs/key.png',
                imageMimeType: 'image/png',
                bank: 'Banco de Venezuela',
                paymentType: 'pago_movil',
                paymentNumber: 'TX-1',
                paymentDate: new Date('2026-05-11'),
                paidAmount: 100,
                submittedAt: new Date('2026-05-11T10:00:00Z'),
              },
      };
    }

    beforeEach(() => {
      storageService.download.mockResolvedValue(Buffer.from('image-bytes'));
    });

    it('returns the buffer + mime + filename for an admin', async () => {
      saleModel.findById.mockResolvedValue(buildSale());

      const result = await service.findPaymentProofStream(SALE_ID, {
        userId: 'admin-id',
        role: 'admin',
      });

      expect(storageService.download).toHaveBeenCalledWith(
        'sales/abc/payment-proofs/key.png',
      );
      expect(result.mimeType).toBe('image/png');
      expect(result.fileName).toBe('payment-proof-S-2026-00001.png');
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
    });

    it('returns the buffer for the owner salesperson', async () => {
      saleModel.findById.mockResolvedValue(buildSale());

      const result = await service.findPaymentProofStream(SALE_ID, {
        userId: VALID_SALES_PERSON_ID,
        role: 'salesPerson',
      });

      expect(Buffer.isBuffer(result.buffer)).toBe(true);
    });

    it('throws ForbiddenException when another salesperson tries', async () => {
      saleModel.findById.mockResolvedValue(buildSale());

      await expect(
        service.findPaymentProofStream(SALE_ID, {
          userId: OTHER_SALES_PERSON_ID,
          role: 'salesPerson',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the sale does not exist', async () => {
      saleModel.findById.mockResolvedValue(null);

      await expect(
        service.findPaymentProofStream(SALE_ID, {
          userId: 'admin-id',
          role: 'admin',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the sale has no paymentProof', async () => {
      saleModel.findById.mockResolvedValue(
        buildSale({ paymentProof: undefined as never }),
      );

      await expect(
        service.findPaymentProofStream(SALE_ID, {
          userId: 'admin-id',
          role: 'admin',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when sale is missing', async () => {
      saleModel.findById.mockResolvedValue(null);

      await expect(service.remove('sale-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each(['paid', 'confirmed', 'payment_rejected'])(
      'throws BadRequestException when the sale status is %s',
      async (status) => {
        saleModel.findById.mockResolvedValue({
          id: 'sale-1',
          saleNumber: 'S-2026-00001',
          status,
          soldBy: { userId: 'user-1', name: 'Sales User' },
          items: [],
        });

        await expect(service.remove('sale-1')).rejects.toThrow(
          BadRequestException,
        );
        expect(inventoryService.create).not.toHaveBeenCalled();
        expect(saleModel.findByIdAndDelete).not.toHaveBeenCalled();
      },
    );

    it('creates inbound reversal transactions and deletes the sale', async () => {
      const sale = {
        id: 'sale-1',
        saleNumber: 'S-2026-00001',
        status: 'placed',
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
