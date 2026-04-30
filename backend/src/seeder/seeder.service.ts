import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CitiesService } from '../cities/cities.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  demoCities,
  demoInventory,
  demoProducts,
  demoWarehouses,
} from './demo-data';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly citiesService: CitiesService,
    private readonly warehousesService: WarehousesService,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdminUser();
    if (this.configService.get<string>('SEED_DEMO_DATA') === 'true') {
      await this.seedDemoData();
    }
  }

  private async seedAdminUser(): Promise<void> {
    const name = this.configService.get<string>('SEED_ADMIN_NAME');
    const email = this.configService.get<string>('SEED_ADMIN_EMAIL');
    const password = this.configService.get<string>('SEED_ADMIN_PASSWORD');

    if (!name || !email || !password) {
      return;
    }

    const exists = await this.usersService.findByEmailExists(email);

    if (exists) {
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await this.usersService.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
    });

    this.logger.log(`Seeded default admin user: ${email}`);
  }

  private async seedDemoData(): Promise<void> {
    await this.seedCities();
    await this.seedWarehouses();
    await this.seedProducts();
    await this.seedInventory();
  }

  private async seedCities(): Promise<void> {
    const { total } = await this.citiesService.findAllPaginated(1, 1);
    if (total > 0) return;

    for (const city of demoCities) {
      await this.citiesService.create({ name: city.name, isActive: true });
    }
    this.logger.log(`Seeded ${demoCities.length} demo cities`);
  }

  private async seedWarehouses(): Promise<void> {
    const { total } = await this.warehousesService.findAllPaginated(1, 1);
    if (total > 0) return;

    const cityOptions = await this.citiesService.findActiveOptions();
    const cityByName = new Map(cityOptions.map((c) => [c.name, c.id]));

    for (const w of demoWarehouses) {
      const cityId = cityByName.get(w.cityName);
      if (!cityId) {
        this.logger.warn(
          `Skipping warehouse "${w.name}" — city "${w.cityName}" not found`,
        );
        continue;
      }
      await this.warehousesService.create({
        name: w.name,
        cityId,
        address: w.address,
        isActive: true,
      });
    }
    this.logger.log(`Seeded ${demoWarehouses.length} demo warehouses`);
  }

  private async seedProducts(): Promise<void> {
    const { total } = await this.productsService.findAllPaginated({
      page: 1,
      limit: 1,
    });
    if (total > 0) return;

    for (const product of demoProducts) {
      await this.productsService.create(product);
    }
    this.logger.log(`Seeded ${demoProducts.length} demo products`);
  }

  private async seedInventory(): Promise<void> {
    const existing = await this.inventoryService.findAllPaginated(1, 1);
    if (existing.total > 0) return;

    const seedUser = await this.findSeedInventoryUser();
    if (!seedUser) {
      this.logger.warn(
        'Skipping inventory seed — no admin user available for createdBy',
      );
      return;
    }

    const productOptions = await this.productsService.findOptions();
    const productByName = new Map(productOptions.map((p) => [p.name, p.id]));
    const warehouseOptions = await this.warehousesService.findActiveOptions();
    const warehouseByName = new Map(
      warehouseOptions.map((w) => [w.name, w.id]),
    );

    for (const tx of demoInventory) {
      const productId = productByName.get(tx.productName);
      const warehouseId = warehouseByName.get(tx.warehouseName);
      if (!productId || !warehouseId) {
        this.logger.warn(
          `Skipping inventory seed for "${tx.productName}" @ "${tx.warehouseName}" — missing reference`,
        );
        continue;
      }
      await this.inventoryService.create(
        {
          productId,
          warehouseId,
          transactionType: 'inbound',
          batch: tx.batch,
          qty: tx.qty,
        },
        { userId: seedUser.userId, name: seedUser.name },
      );
    }
    this.logger.log(`Seeded ${demoInventory.length} demo inventory entries`);
  }

  private async findSeedInventoryUser(): Promise<
    { userId: string; name: string } | null
  > {
    const email = this.configService.get<string>('SEED_ADMIN_EMAIL');
    if (email) {
      const admin = await this.usersService.findByEmail(email);
      if (admin) {
        return { userId: admin.id, name: admin.name };
      }
    }
    const users = await this.usersService.findAll();
    const fallback = users.find((u) => u.role === 'admin') ?? users[0];
    return fallback ? { userId: fallback.id, name: fallback.name } : null;
  }
}
