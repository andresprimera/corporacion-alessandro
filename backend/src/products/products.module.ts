import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { UnitsModule } from '../units/units.module';
import { PresentationsModule } from '../presentations/presentations.module';
import { LiquorTypesModule } from '../liquor-types/liquor-types.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    forwardRef(() => UnitsModule),
    forwardRef(() => PresentationsModule),
    forwardRef(() => LiquorTypesModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
