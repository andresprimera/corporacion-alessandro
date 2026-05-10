import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

@Schema({ _id: false })
export class WarehouseAllocation {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Warehouse', required: true })
  warehouseId: Types.ObjectId;

  @Prop({ required: true })
  warehouseName: string;

  @Prop({ required: true })
  qty: number;
}

export const WarehouseAllocationSchema =
  SchemaFactory.createForClass(WarehouseAllocation);

@Schema({ _id: false })
export class SaleItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true, enum: ['groceries', 'liquor'] })
  productKind: string;

  @Prop({ required: true })
  requestedQty: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: [WarehouseAllocationSchema], required: true })
  allocations: WarehouseAllocation[];
}

export const SaleItemSchema = SchemaFactory.createForClass(SaleItem);

@Schema({ _id: false })
export class SaleSoldBy {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  name: string;
}

export const SaleSoldBySchema = SchemaFactory.createForClass(SaleSoldBy);

export type SaleDocument = HydratedDocument<Sale>;

@Schema({ timestamps: true })
export class Sale {
  @Prop({ required: true, unique: true })
  saleNumber: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ required: true })
  clientName: string;

  @Prop({ required: false, trim: true })
  notes?: string;

  @Prop({ type: [SaleItemSchema], required: true })
  items: SaleItem[];

  @Prop({ required: true })
  totalQty: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: SaleSoldBySchema, required: true })
  soldBy: SaleSoldBy;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);

SaleSchema.index({ createdAt: -1 });
