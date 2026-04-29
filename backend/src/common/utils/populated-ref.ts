import { Types } from 'mongoose';

export interface PopulatedRefBase {
  _id: Types.ObjectId;
}

export function readPopulatedRef<T extends PopulatedRefBase>(
  ref: Types.ObjectId | T,
): { id: string; doc: T | null } {
  if (ref instanceof Types.ObjectId) {
    return { id: ref.toString(), doc: null };
  }
  return { id: ref._id.toString(), doc: ref };
}
