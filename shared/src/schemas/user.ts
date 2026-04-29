import { z } from "zod/v4";

export const roleEnum = z.enum(["admin", "user", "salesPerson"]);
export type Role = z.infer<typeof roleEnum>;

export const userStatusEnum = z.enum(["approved", "in_revision"]);
export type UserStatus = z.infer<typeof userStatusEnum>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: roleEnum,
  status: userStatusEnum.optional(),
});

export type User = z.infer<typeof userSchema>;
