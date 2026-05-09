import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Presentation,
  PresentationSchema,
} from './schemas/presentation.schema';
import { ProductsModule } from '../products/products.module';
import { PresentationsService } from './presentations.service';
import { PresentationsController } from './presentations.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Presentation.name, schema: PresentationSchema },
    ]),
    forwardRef(() => ProductsModule),
  ],
  controllers: [PresentationsController],
  providers: [PresentationsService],
  exports: [PresentationsService],
})
export class PresentationsModule {}
