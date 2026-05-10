import { type Role, type User, type UserStatus } from '@base-dashboard/shared';
import { UserDocument } from '../schemas/user.schema';

export function toUser(doc: UserDocument): User {
  return {
    id: doc.id,
    email: doc.email,
    name: doc.name,
    role: doc.role as Role,
    status: doc.status as UserStatus | undefined,
    commissionPercentage: doc.commissionPercentage,
  };
}
