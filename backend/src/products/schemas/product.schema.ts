import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class ProductPrice {
  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({ required: true })
  currency: string;
}

export const ProductPriceSchema = SchemaFactory.createForClass(ProductPrice);

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: ['groceries', 'liquor'] })
  kind!: string;

  @Prop({ type: ProductPriceSchema, required: true })
  price: ProductPrice;

  @Prop({
    enum: ['rum', 'whisky', 'vodka', 'gin', 'tequila', 'other'],
    required: false,
  })
  liquorType?: string;

  @Prop({ enum: ['L1', 'ML750'], required: false })
  presentation?: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
