import { z } from "zod/v4";

export const roleEnum = z.enum(["admin", "user"]);
export type Role = z.infer<typeof roleEnum>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: roleEnum,
});

export type User = z.infer<typeof userSchema>;
