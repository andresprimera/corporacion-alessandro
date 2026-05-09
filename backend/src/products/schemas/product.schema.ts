import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

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

  @Prop({ type: SchemaTypes.ObjectId, ref: 'LiquorType', required: false })
  liquorTypeId?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Presentation', required: false })
  presentationId?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Unit', required: true })
  basicUnitId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Unit', required: false })
  packageUnitId?: Types.ObjectId;

  @Prop({ required: false, min: 2 })
  unitsPerPackage?: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
