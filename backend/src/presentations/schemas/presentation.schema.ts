import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PresentationDocument = HydratedDocument<Presentation>;

@Schema({ timestamps: true })
export class Presentation {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, maxlength: 10 })
  abbreviation: string;
}

export const PresentationSchema = SchemaFactory.createForClass(Presentation);
