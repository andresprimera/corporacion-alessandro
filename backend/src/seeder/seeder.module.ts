import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CitiesModule } from '../cities/cities.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { ProductsModule } from '../products/products.module';
import { UnitsModule } from '../units/units.module';
import { PresentationsModule } from '../presentations/presentations.module';
import { LiquorTypesModule } from '../liquor-types/liquor-types.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ClientsModule } from '../clients/clients.module';
import { SeederService } from './seeder.service';

@Module({
  imports: [
    UsersModule,
    CitiesModule,
    WarehousesModule,
    ProductsModule,
    UnitsModule,
    PresentationsModule,
    LiquorTypesModule,
    InventoryModule,
    ClientsModule,
  ],
  providers: [SeederService],
})
export class SeederModule {}
