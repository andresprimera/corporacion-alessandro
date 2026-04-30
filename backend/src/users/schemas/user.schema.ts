import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({
    required: true,
    enum: ['admin', 'user', 'salesPerson'],
    default: 'user',
  })
  role!: string;

  @Prop({ enum: ['approved', 'in_revision'], required: false })
  status?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'City', required: false })
  cityId?: Types.ObjectId;

  @Prop({ type: Number, min: 0, max: 100, required: false })
  commissionPercentage?: number;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ select: false })
  hashedRefreshToken?: string;

  @Prop({ select: false })
  hashedPasswordResetToken?: string;

  @Prop({ select: false })
  passwordResetExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
