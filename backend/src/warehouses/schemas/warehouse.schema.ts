import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type WarehouseDocument = HydratedDocument<Warehouse>;

@Schema({ timestamps: true })
export class Warehouse {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'City', required: true })
  cityId: Types.ObjectId;

  @Prop({ required: false, trim: true })
  address?: string;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);
