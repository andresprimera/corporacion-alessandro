import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LiquorType,
  LiquorTypeSchema,
} from './schemas/liquor-type.schema';
import { ProductsModule } from '../products/products.module';
import { LiquorTypesService } from './liquor-types.service';
import { LiquorTypesController } from './liquor-types.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LiquorType.name, schema: LiquorTypeSchema },
    ]),
    forwardRef(() => ProductsModule),
  ],
  controllers: [LiquorTypesController],
  providers: [LiquorTypesService],
  exports: [LiquorTypesService],
})
export class LiquorTypesModule {}
