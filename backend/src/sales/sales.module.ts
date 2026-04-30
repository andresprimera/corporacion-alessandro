import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sale, SaleSchema } from './schemas/sale.schema';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { ProductsModule } from '../products/products.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { CitiesModule } from '../cities/cities.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sale.name, schema: SaleSchema }]),
    ProductsModule,
    WarehousesModule,
    InventoryModule,
    ClientsModule,
    UsersModule,
    CitiesModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
