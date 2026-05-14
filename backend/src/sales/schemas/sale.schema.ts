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
export class SaleEnteredUnit {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Unit', required: true })
  unitId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  abbreviation: string;
}

export const SaleEnteredUnitSchema =
  SchemaFactory.createForClass(SaleEnteredUnit);

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

  @Prop({ required: false })
  enteredQty?: number;

  @Prop({ type: SaleEnteredUnitSchema, required: false })
  enteredUnit?: SaleEnteredUnit;

  @Prop({ required: false })
  unitsPerPackageAtEntry?: number;

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

@Schema({ _id: false })
export class PaymentProof {
  @Prop({ required: true })
  imageKey: string;

  @Prop({ required: true })
  imageMimeType: string;

  @Prop({ required: true })
  bank: string;

  @Prop({ required: true, enum: ['pago_movil', 'bank_transfer'] })
  paymentType: string;

  @Prop({ required: true })
  paymentNumber: string;

  @Prop({ required: true })
  paymentDate: Date;

  @Prop({ required: true })
  paidAmount: number;

  @Prop({ required: true })
  submittedAt: Date;
}

export const PaymentProofSchema = SchemaFactory.createForClass(PaymentProof);

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

  @Prop({
    required: true,
    enum: ['placed', 'paid', 'confirmed', 'payment_rejected'],
    default: 'placed',
  })
  status: string;

  @Prop({ type: PaymentProofSchema, required: false })
  paymentProof?: PaymentProof;

  @Prop({ required: true, default: false })
  delivered: boolean;

  @Prop({ type: SaleSoldBySchema, required: true })
  soldBy: SaleSoldBy;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);

SaleSchema.index({ createdAt: -1 });
