import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { CitiesModule } from '../cities/cities.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ClientsModule } from '../clients/clients.module';
import { SalesModule } from '../sales/sales.module';
import { Sale, SaleSchema } from '../sales/schemas/sale.schema';
import { SeederService } from './seeder.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sale.name, schema: SaleSchema }]),
    UsersModule,
    CitiesModule,
    WarehousesModule,
    ProductsModule,
    InventoryModule,
    ClientsModule,
    SalesModule,
  ],
  providers: [SeederService],
})
export class SeederModule {}
