import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { type Role, type UserStatus } from '@base-dashboard/shared';
import { User, UserDocument } from './schemas/user.schema';

export type CreateUserData = {
  name: string;
  email: string;
  password: string;
  role: Role;
  status?: UserStatus;
};

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(data: CreateUserData): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  async countUsers(): Promise<number> {
    return this.userModel.countDocuments();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find();
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{ data: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel.find().skip(skip).limit(limit),
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
    if (role === 'salesPerson' && user.status === undefined) {
      update.status = 'approved';
    } else if (role !== 'salesPerson' && user.status !== undefined) {
      update.$unset = { status: 1 };
    }

    return this.userModel.findByIdAndUpdate(userId, update, { new: true });
  }

  async updateStatus(
    userId: string,
    status: UserStatus,
  ): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { status }, { new: true });
  }

  async remove(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId);
  }

  async findByEmailExists(email: string): Promise<boolean> {
    return this.userModel.exists({ email }).then((result) => result !== null);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password');
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async updateRefreshToken(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { hashedRefreshToken });
  }

  async findByIdWithRefreshToken(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+hashedRefreshToken');
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
    return this.userModel.findByIdAndUpdate(userId, data, { new: true });
  }

  async findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+password');
  }
}
