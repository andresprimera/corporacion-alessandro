import { z } from "zod/v4";
import { userSchema, roleEnum } from "./user";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const updateUserRoleSchema = z.object({
  role: roleEnum,
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
