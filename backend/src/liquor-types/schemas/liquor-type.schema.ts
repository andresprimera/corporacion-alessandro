import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LiquorTypeDocument = HydratedDocument<LiquorType>;

@Schema({ timestamps: true })
export class LiquorType {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, maxlength: 10 })
  abbreviation: string;
}

export const LiquorTypeSchema = SchemaFactory.createForClass(LiquorType);
