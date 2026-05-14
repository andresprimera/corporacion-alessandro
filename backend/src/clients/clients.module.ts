import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from './schemas/client.schema';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { UsersModule } from '../users/users.module';
import { CitiesModule } from '../cities/cities.module';
import { Sale, SaleSchema } from '../sales/schemas/sale.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: Sale.name, schema: SaleSchema },
    ]),
    UsersModule,
    forwardRef(() => CitiesModule),
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
