import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExchangeRateDocument = HydratedDocument<ExchangeRate>;

@Schema({ timestamps: true })
export class ExchangeRate {
  @Prop({ required: true, unique: true, index: true })
  rateDate!: Date;

  @Prop({ required: true, type: Number, min: 0 })
  value!: number;
}

export const ExchangeRateSchema = SchemaFactory.createForClass(ExchangeRate);
