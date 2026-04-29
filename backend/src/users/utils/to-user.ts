import { type Role, type User, type UserStatus } from '@base-dashboard/shared';
import { UserDocument } from '../schemas/user.schema';
import {
  PopulatedRefBase,
  readPopulatedRef,
} from '../../common/utils/populated-ref';

export interface PopulatedCity extends PopulatedRefBase {
  name: string;
}

export function toUser(doc: UserDocument): User {
  const city = doc.cityId
    ? readPopulatedRef<PopulatedCity>(doc.cityId)
    : null;
  return {
    id: doc.id,
    email: doc.email,
    name: doc.name,
    role: doc.role as Role,
    status: doc.status as UserStatus | undefined,
    cityId: city?.id,
    cityName: city?.doc?.name,
  };
}
