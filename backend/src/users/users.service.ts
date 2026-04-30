import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  type Role,
  type SalesPersonOption,
  type UserStatus,
} from '@base-dashboard/shared';
import { User, UserDocument } from './schemas/user.schema';

export type CreateUserData = {
  name: string;
  email: string;
  password: string;
  role: Role;
  status?: UserStatus;
  cityId?: string;
  commissionPercentage?: number;
};

const DEFAULT_COMMISSION_PERCENTAGE = 3;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(data: CreateUserData): Promise<UserDocument> {
    const { cityId, commissionPercentage, role, ...rest } = data;
    const commission =
      role === 'salesPerson'
        ? (commissionPercentage ?? DEFAULT_COMMISSION_PERCENTAGE)
        : undefined;
    const created = await this.userModel.create({
      ...rest,
      role,
      ...(cityId ? { cityId: new Types.ObjectId(cityId) } : {}),
      ...(commission !== undefined ? { commissionPercentage: commission } : {}),
    });
    await created.populate('cityId', 'name');
    return created;
  }

  async countUsers(): Promise<number> {
    return this.userModel.countDocuments();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find();
  }

  async findSalesPersonOptions(): Promise<SalesPersonOption[]> {
    const docs = await this.userModel
      .find({ role: 'salesPerson', status: 'approved' }, { name: 1 })
      .sort({ name: 1 });
    return docs.map((d) => ({ id: d.id, name: d.name }));
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{ data: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel
        .find()
        .skip(skip)
        .limit(limit)
        .populate('cityId', 'name'),
      this.userModel.countDocuments(),
    ]);
    return { data, total };
  }

  async updateRole(
    userId: string,
    role: Role,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findById(userId);
    if (!user) return null;

    const update: Record<string, unknown> = { role };
    if (role === 'salesPerson') {
      if (user.status === undefined) {
        update.status = 'approved';
      }
      if (user.commissionPercentage === undefined) {
        update.commissionPercentage = DEFAULT_COMMISSION_PERCENTAGE;
      }
    } else {
      const unset: Record<string, 1> = {};
      if (user.status !== undefined) unset.status = 1;
      if (user.cityId) unset.cityId = 1;
      if (user.commissionPercentage !== undefined) {
        unset.commissionPercentage = 1;
      }
      if (Object.keys(unset).length > 0) {
        update.$unset = unset;
      }
    }

    return this.userModel
      .findByIdAndUpdate(userId, update, { new: true })
      .populate('cityId', 'name');
  }

  async updateCommission(
    userId: string,
    commissionPercentage: number,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { commissionPercentage }, { new: true })
      .populate('cityId', 'name');
  }

  async updateStatus(
    userId: string,
    status: UserStatus,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { status }, { new: true })
      .populate('cityId', 'name');
  }

  async updateCity(
    userId: string,
    cityId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { cityId: new Types.ObjectId(cityId) },
        { new: true },
      )
      .populate('cityId', 'name');
  }

  async remove(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId);
  }

  async findByEmailExists(email: string): Promise<boolean> {
    return this.userModel.exists({ email }).then((result) => result !== null);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('+password')
      .populate('cityId', 'name');
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).populate('cityId', 'name');
  }

  async updateRefreshToken(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { hashedRefreshToken });
  }

  async findByIdWithRefreshToken(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findById(id)
      .select('+hashedRefreshToken')
      .populate('cityId', 'name');
  }

  async updatePasswordResetToken(
    userId: string,
    hashedToken: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      hashedPasswordResetToken: hashedToken,
      passwordResetExpires: expires,
    });
  }

  async findByEmailWithResetToken(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('+hashedPasswordResetToken +passwordResetExpires');
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $unset: { hashedPasswordResetToken: 1, passwordResetExpires: 1 },
    });
  }

  async updatePassword(
    userId: string,
    hashedPassword: string,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });
  }

  async updateProfile(
    userId: string,
    data: { name: string; email: string },
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, data, { new: true })
      .populate('cityId', 'name');
  }

  async findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+password');
  }
}
