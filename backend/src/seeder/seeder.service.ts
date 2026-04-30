import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CitiesService } from '../cities/cities.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { ClientsService } from '../clients/clients.service';
import { SalesService } from '../sales/sales.service';
import { Sale } from '../sales/schemas/sale.schema';
import { readPopulatedRef } from '../common/utils/populated-ref';
import {
  DEMO_SALES_PERSON_PASSWORD,
  demoCities,
  demoClients,
  demoInventory,
  demoProducts,
  demoSales,
  demoSalesPeople,
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
    private readonly clientsService: ClientsService,
    private readonly salesService: SalesService,
    @InjectModel(Sale.name) private readonly saleModel: Model<Sale>,
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
    await this.seedSalesPeople();
    await this.seedClients();
    await this.seedSales();
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

  private async seedSalesPeople(): Promise<void> {
    const cityOptions = await this.citiesService.findActiveOptions();
    const cityByName = new Map(cityOptions.map((c) => [c.name, c.id]));

    let created = 0;
    for (const person of demoSalesPeople) {
      if (await this.usersService.findByEmailExists(person.email)) continue;
      const cityId = cityByName.get(person.cityName);
      if (!cityId) {
        this.logger.warn(
          `Skipping sales person "${person.name}" — city "${person.cityName}" not found`,
        );
        continue;
      }
      const hashedPassword = await bcrypt.hash(DEMO_SALES_PERSON_PASSWORD, 12);
      await this.usersService.create({
        name: person.name,
        email: person.email,
        password: hashedPassword,
        role: 'salesPerson',
        status: 'approved',
        cityId,
        commissionPercentage: person.commissionPercentage,
      });
      created++;
    }
    if (created > 0) {
      this.logger.log(`Seeded ${created} demo sales people`);
    }
  }

  private async seedClients(): Promise<void> {
    let created = 0;
    for (const client of demoClients) {
      const salesPerson = await this.usersService.findByEmail(
        client.salesPersonEmail,
      );
      if (!salesPerson) {
        this.logger.warn(
          `Skipping client "${client.name}" — sales person ${client.salesPersonEmail} not found`,
        );
        continue;
      }
      const existing = await this.clientsService.findOptions({
        salesPersonId: salesPerson.id,
      });
      if (existing.some((c) => c.rif === client.rif)) continue;
      await this.clientsService.create({
        name: client.name,
        rif: client.rif,
        address: client.address,
        phone: client.phone,
        salesPersonId: salesPerson.id,
      });
      created++;
    }
    if (created > 0) {
      this.logger.log(`Seeded ${created} demo clients`);
    }
  }

  private async seedSales(): Promise<void> {
    const existing = await this.salesService.findAllPaginated(1, 1);
    if (existing.total > 0) return;

    const productOptions = await this.productsService.findOptions();
    const productByName = new Map(productOptions.map((p) => [p.name, p]));

    let created = 0;
    for (const sale of demoSales) {
      const salesPerson = await this.usersService.findByEmail(sale.soldByEmail);
      if (!salesPerson) {
        this.logger.warn(
          `Skipping sale — sales person ${sale.soldByEmail} not found`,
        );
        continue;
      }
      const clientOptions = await this.clientsService.findOptions({
        salesPersonId: salesPerson.id,
      });
      const client = clientOptions.find((c) => c.rif === sale.clientRif);
      if (!client) {
        this.logger.warn(
          `Skipping sale — client ${sale.clientRif} not found for ${sale.soldByEmail}`,
        );
        continue;
      }
      if (!salesPerson.cityId) {
        this.logger.warn(
          `Skipping sale — sales person ${sale.soldByEmail} has no city`,
        );
        continue;
      }
      const cityId = readPopulatedRef(salesPerson.cityId).id;
      const items = sale.items
        .map((item) => {
          const product = productByName.get(item.productName);
          if (!product) {
            this.logger.warn(
              `Skipping sale item — product "${item.productName}" not found`,
            );
            return null;
          }
          return {
            productId: product.id,
            requestedQty: item.qty,
            unitPrice: product.price.value,
          };
        })
        .filter((i): i is NonNullable<typeof i> => i !== null);
      if (items.length === 0) continue;

      try {
        const createdSale = await this.salesService.create(
          {
            cityId,
            clientId: client.id,
            notes: sale.notes,
            items,
          },
          { userId: salesPerson.id, name: salesPerson.name },
          { role: 'admin' },
        );
        const targetDate = new Date(
          Date.now() - sale.daysAgo * 24 * 60 * 60 * 1000,
        );
        await this.saleModel.updateOne(
          { _id: createdSale._id },
          { $set: { createdAt: targetDate, updatedAt: targetDate } },
          { timestamps: false },
        );
        created++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Skipping sale for ${sale.soldByEmail} → ${sale.clientRif}: ${message}`,
        );
      }
    }
    if (created > 0) {
      this.logger.log(`Seeded ${created} demo sales`);
    }
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
