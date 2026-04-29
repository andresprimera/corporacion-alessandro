import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type ClientDocument = HydratedDocument<Client>;

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  rif: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  salesPersonId: Types.ObjectId;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

ClientSchema.index({ salesPersonId: 1, createdAt: -1 });
ClientSchema.index({ rif: 1, salesPersonId: 1 }, { unique: true });
