import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SeederService } from './seeder.service';
import { UsersService } from '../users/users.service';
import { CitiesService } from '../cities/cities.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { demoCities, demoInventory, demoProducts, demoWarehouses } from './demo-data';

jest.mock('bcrypt');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('SeederService', () => {
  let service: SeederService;

  const usersService = {
    findByEmailExists: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  };
  const citiesService = {
    findAllPaginated: jest.fn(),
    findActiveOptions: jest.fn(),
    create: jest.fn(),
  };
  const warehousesService = {
    findAllPaginated: jest.fn(),
    findActiveOptions: jest.fn(),
    create: jest.fn(),
  };
  const productsService = {
    findAllPaginated: jest.fn(),
    findOptions: jest.fn(),
    create: jest.fn(),
  };
  const inventoryService = {
    findAllPaginated: jest.fn(),
    create: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeederService,
        { provide: UsersService, useValue: usersService },
        { provide: CitiesService, useValue: citiesService },
        { provide: WarehousesService, useValue: warehousesService },
        { provide: ProductsService, useValue: productsService },
        { provide: InventoryService, useValue: inventoryService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<SeederService>(SeederService);
    mockedBcrypt.hash.mockResolvedValue('hashed-pw' as never);
  });

  describe('admin user seeding', () => {
    it('should skip when seed admin env vars are missing', async () => {
      configService.get.mockReturnValue(undefined);

      await service.onModuleInit();

      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should skip when admin user already exists', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SEED_ADMIN_NAME') return 'Admin';
        if (key === 'SEED_ADMIN_EMAIL') return 'admin@x.com';
        if (key === 'SEED_ADMIN_PASSWORD') return 'pw';
        return undefined;
      });
      usersService.findByEmailExists.mockResolvedValue(true);

      await service.onModuleInit();

      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should create admin user when env vars are set and email is new', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SEED_ADMIN_NAME') return 'Admin';
        if (key === 'SEED_ADMIN_EMAIL') return 'admin@x.com';
        if (key === 'SEED_ADMIN_PASSWORD') return 'pw';
        return undefined;
      });
      usersService.findByEmailExists.mockResolvedValue(false);

      await service.onModuleInit();

      expect(usersService.create).toHaveBeenCalledWith({
        name: 'Admin',
        email: 'admin@x.com',
        password: 'hashed-pw',
        role: 'admin',
      });
    });
  });

  describe('demo data seeding', () => {
    function enableDemo() {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SEED_DEMO_DATA') return 'true';
        return undefined;
      });
    }

    it('should skip demo data when SEED_DEMO_DATA is not "true"', async () => {
      configService.get.mockReturnValue(undefined);

      await service.onModuleInit();

      expect(citiesService.create).not.toHaveBeenCalled();
      expect(warehousesService.create).not.toHaveBeenCalled();
      expect(productsService.create).not.toHaveBeenCalled();
      expect(inventoryService.create).not.toHaveBeenCalled();
    });

    it('should seed cities when none exist', async () => {
      enableDemo();
      citiesService.findAllPaginated.mockResolvedValue({ data: [], total: 0 });
      warehousesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      productsService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      inventoryService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });

      await service.onModuleInit();

      expect(citiesService.create).toHaveBeenCalledTimes(demoCities.length);
      expect(citiesService.create).toHaveBeenCalledWith({
        name: 'Caracas',
        isActive: true,
      });
    });

    it('should not seed cities when some already exist', async () => {
      enableDemo();
      citiesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      warehousesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      productsService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      inventoryService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });

      await service.onModuleInit();

      expect(citiesService.create).not.toHaveBeenCalled();
    });

    it('should seed warehouses against existing cities', async () => {
      enableDemo();
      citiesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      warehousesService.findAllPaginated.mockResolvedValue({ data: [], total: 0 });
      productsService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      inventoryService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      citiesService.findActiveOptions.mockResolvedValue(
        demoCities.map((c, i) => ({ id: `city-${i}`, name: c.name })),
      );

      await service.onModuleInit();

      expect(warehousesService.create).toHaveBeenCalledTimes(demoWarehouses.length);
      const firstCall = warehousesService.create.mock.calls[0][0];
      expect(firstCall).toMatchObject({
        name: 'Almacén Caracas Norte',
        cityId: 'city-0',
        isActive: true,
      });
    });

    it('should skip warehouses whose city is missing', async () => {
      enableDemo();
      citiesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      warehousesService.findAllPaginated.mockResolvedValue({ data: [], total: 0 });
      productsService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      inventoryService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      citiesService.findActiveOptions.mockResolvedValue([
        { id: 'city-0', name: 'Caracas' },
      ]);

      await service.onModuleInit();

      // Only Caracas warehouses get created (2 of them)
      const caracasOnly = demoWarehouses.filter((w) => w.cityName === 'Caracas');
      expect(warehousesService.create).toHaveBeenCalledTimes(caracasOnly.length);
    });

    it('should seed products when none exist', async () => {
      enableDemo();
      citiesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      warehousesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      productsService.findAllPaginated.mockResolvedValue({ data: [], total: 0 });
      inventoryService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });

      await service.onModuleInit();

      expect(productsService.create).toHaveBeenCalledTimes(demoProducts.length);
      expect(productsService.create).toHaveBeenCalledWith(demoProducts[0]);
    });

    it('should seed inventory transactions referencing the admin user', async () => {
      enableDemo();
      configService.get.mockImplementation((key: string) => {
        if (key === 'SEED_DEMO_DATA') return 'true';
        if (key === 'SEED_ADMIN_EMAIL') return 'admin@x.com';
        return undefined;
      });
      citiesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      warehousesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      productsService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      inventoryService.findAllPaginated.mockResolvedValue({ data: [], total: 0 });
      usersService.findByEmail.mockResolvedValue({
        id: 'admin-1',
        name: 'Admin',
      });
      productsService.findOptions.mockResolvedValue(
        demoProducts.map((p, i) => ({ id: `prod-${i}`, name: p.name, kind: p.kind })),
      );
      warehousesService.findActiveOptions.mockResolvedValue(
        demoWarehouses.map((w, i) => ({ id: `wh-${i}`, name: w.name })),
      );

      await service.onModuleInit();

      expect(inventoryService.create).toHaveBeenCalledTimes(demoInventory.length);
      const [firstDto, firstCreatedBy] = inventoryService.create.mock.calls[0];
      expect(firstDto).toMatchObject({
        transactionType: 'inbound',
        batch: demoInventory[0].batch,
        qty: demoInventory[0].qty,
      });
      expect(firstCreatedBy).toEqual({ userId: 'admin-1', name: 'Admin' });
    });

    it('should fall back to any admin user when SEED_ADMIN_EMAIL is unset', async () => {
      enableDemo();
      citiesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      warehousesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      productsService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      inventoryService.findAllPaginated.mockResolvedValue({ data: [], total: 0 });
      usersService.findAll.mockResolvedValue([
        { id: 'admin-9', name: 'Existing Admin', role: 'admin' },
      ]);
      productsService.findOptions.mockResolvedValue([
        { id: 'prod-0', name: demoInventory[0].productName, kind: 'groceries' },
      ]);
      warehousesService.findActiveOptions.mockResolvedValue([
        { id: 'wh-0', name: demoInventory[0].warehouseName },
      ]);

      await service.onModuleInit();

      const calls = inventoryService.create.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][1]).toEqual({ userId: 'admin-9', name: 'Existing Admin' });
    });

    it('should skip inventory when no user exists at all', async () => {
      enableDemo();
      citiesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      warehousesService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      productsService.findAllPaginated.mockResolvedValue({ data: [], total: 1 });
      inventoryService.findAllPaginated.mockResolvedValue({ data: [], total: 0 });
      usersService.findAll.mockResolvedValue([]);

      await service.onModuleInit();

      expect(inventoryService.create).not.toHaveBeenCalled();
    });
  });
});
