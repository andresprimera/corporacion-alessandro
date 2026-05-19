import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CitiesService } from '../cities/cities.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { ProductsService } from '../products/products.service';
import { UnitsService } from '../units/units.service';
import { PresentationsService } from '../presentations/presentations.service';
import { LiquorTypesService } from '../liquor-types/liquor-types.service';
import { InventoryService } from '../inventory/inventory.service';
import { ClientsService } from '../clients/clients.service';
import {
  DEMO_SALES_PERSON_PASSWORD,
  demoAdmins,
  demoCities,
  demoClients,
  demoInventory,
  demoLiquorTypes,
  demoPresentations,
  demoProducts,
  demoSalesPeople,
  demoUnits,
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
    private readonly unitsService: UnitsService,
    private readonly presentationsService: PresentationsService,
    private readonly liquorTypesService: LiquorTypesService,
    private readonly inventoryService: InventoryService,
    private readonly clientsService: ClientsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdminUser();
    if (this.configService.get<string>('SEED_DEMO_DATA') === 'true') {
      await this.seedDemoAdmins();
      await this.seedDemoData();
    }
  }

  private async seedDemoAdmins(): Promise<void> {
    for (const admin of demoAdmins) {
      const exists = await this.usersService.findByEmailExists(admin.email);
      if (exists) continue;
      const hashedPassword = await bcrypt.hash(admin.password, 12);
      await this.usersService.create({
        name: admin.name,
        email: admin.email,
        password: hashedPassword,
        role: 'admin',
      });
      this.logger.log(`Seeded demo admin user: ${admin.email}`);
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
    await this.seedUnits();
    await this.seedPresentations();
    await this.seedLiquorTypes();
    await this.seedProducts();
    await this.seedInventory();
    await this.seedSalesPeople();
    await this.seedClients();
  }

  private async seedUnits(): Promise<void> {
    const { total } = await this.unitsService.findAllPaginated(1, 1);
    if (total > 0) return;

    for (const unit of demoUnits) {
      await this.unitsService.create(unit);
    }
    this.logger.log(`Seeded ${demoUnits.length} demo units`);
  }

  private async seedPresentations(): Promise<void> {
    const { total } = await this.presentationsService.findAllPaginated(1, 1);
    if (total > 0) return;

    for (const presentation of demoPresentations) {
      await this.presentationsService.create(presentation);
    }
    this.logger.log(`Seeded ${demoPresentations.length} demo presentations`);
  }

  private async seedLiquorTypes(): Promise<void> {
    const { total } = await this.liquorTypesService.findAllPaginated(1, 1);
    if (total > 0) return;

    for (const liquorType of demoLiquorTypes) {
      await this.liquorTypesService.create(liquorType);
    }
    this.logger.log(`Seeded ${demoLiquorTypes.length} demo liquor types`);
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

    for (const w of demoWarehouses) {
      await this.warehousesService.create({
        name: w.name,
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

    const unitOptions = await this.unitsService.findOptions();
    const unitByName = new Map(unitOptions.map((u) => [u.name, u.id]));
    const presentationOptions =
      await this.presentationsService.findOptions();
    const presentationByName = new Map(
      presentationOptions.map((p) => [p.name, p.id]),
    );
    const liquorTypeOptions = await this.liquorTypesService.findOptions();
    const liquorTypeByName = new Map(
      liquorTypeOptions.map((l) => [l.name, l.id]),
    );

    for (const product of demoProducts) {
      const basicUnitId = unitByName.get(product.basicUnitName);
      if (!basicUnitId) {
        this.logger.warn(
          `Skipping product "${product.name}" — basic unit "${product.basicUnitName}" not found`,
        );
        continue;
      }
      const packageUnitId = product.packageUnitName
        ? unitByName.get(product.packageUnitName)
        : undefined;
      if (product.packageUnitName && !packageUnitId) {
        this.logger.warn(
          `Skipping product "${product.name}" — package unit "${product.packageUnitName}" not found`,
        );
        continue;
      }

      if (product.kind === 'liquor') {
        const presentationId = presentationByName.get(product.presentationName);
        if (!presentationId) {
          this.logger.warn(
            `Skipping product "${product.name}" — presentation "${product.presentationName}" not found`,
          );
          continue;
        }
        const liquorTypeId = liquorTypeByName.get(product.liquorTypeName);
        if (!liquorTypeId) {
          this.logger.warn(
            `Skipping product "${product.name}" — liquor type "${product.liquorTypeName}" not found`,
          );
          continue;
        }
        await this.productsService.create({
          kind: 'liquor',
          name: product.name,
          price: product.price,
          liquorTypeId,
          presentationId,
          basicUnitId,
          packageUnitId,
          unitsPerPackage: product.unitsPerPackage,
        });
      } else {
        await this.productsService.create({
          kind: 'groceries',
          name: product.name,
          price: product.price,
          basicUnitId,
          packageUnitId,
          unitsPerPackage: product.unitsPerPackage,
        });
      }
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
    let created = 0;
    for (const person of demoSalesPeople) {
      if (await this.usersService.findByEmailExists(person.email)) continue;
      const hashedPassword = await bcrypt.hash(DEMO_SALES_PERSON_PASSWORD, 12);
      await this.usersService.create({
        name: person.name,
        email: person.email,
        password: hashedPassword,
        role: 'salesPerson',
        status: 'approved',
        commissionPercentage: person.commissionPercentage,
      });
      created++;
    }
    if (created > 0) {
      this.logger.log(`Seeded ${created} demo sales people`);
    }
  }

  private async seedClients(): Promise<void> {
    const cityOptions = await this.citiesService.findActiveOptions();
    const cityByName = new Map(cityOptions.map((c) => [c.name, c.id]));

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
      const cityId = cityByName.get(client.cityName);
      if (!cityId) {
        this.logger.warn(
          `Skipping client "${client.name}" — city "${client.cityName}" not found`,
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
        cityId,
        salesPersonId: salesPerson.id,
      });
      created++;
    }
    if (created > 0) {
      this.logger.log(`Seeded ${created} demo clients`);
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
