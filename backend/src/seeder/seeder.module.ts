import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CitiesModule } from '../cities/cities.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SeederService } from './seeder.service';

@Module({
  imports: [
    UsersModule,
    CitiesModule,
    WarehousesModule,
    ProductsModule,
    InventoryModule,
  ],
  providers: [SeederService],
})
export class SeederModule {}
