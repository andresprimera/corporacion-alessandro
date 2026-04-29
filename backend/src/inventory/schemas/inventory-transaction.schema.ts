import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

@Schema({ _id: false })
export class TransactionCreatedBy {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  name: string;
}

export const TransactionCreatedBySchema = SchemaFactory.createForClass(
  TransactionCreatedBy,
);

export type InventoryTransactionDocument =
  HydratedDocument<InventoryTransaction>;

@Schema({ timestamps: true })
export class InventoryTransaction {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Warehouse', required: true })
  warehouseId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['inbound', 'outbound', 'adjustment'],
  })
  transactionType: string;

  @Prop({ required: true, trim: true })
  batch: string;

  @Prop({ required: true })
  qty: number;

  @Prop({ required: false, trim: true })
  notes?: string;

  @Prop({ required: false })
  expirationDate?: Date;

  @Prop({ type: TransactionCreatedBySchema, required: true })
  createdBy: TransactionCreatedBy;
}

export const InventoryTransactionSchema = SchemaFactory.createForClass(
  InventoryTransaction,
);

InventoryTransactionSchema.index({ productId: 1, warehouseId: 1 });
InventoryTransactionSchema.index({ warehouseId: 1 });
