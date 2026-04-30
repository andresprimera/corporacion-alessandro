import { z } from "zod/v4";
import { userSchema, roleEnum, userStatusEnum } from "./user";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  cityId: z.string().min(1, "City is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const createUserSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: roleEnum,
    cityId: z.string().optional(),
  })
  .refine((data) => data.role !== "salesPerson" || !!data.cityId, {
    message: "City is required for sales people",
    path: ["cityId"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

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

export const updateUserStatusSchema = z.object({
  status: userStatusEnum,
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const updateUserCitySchema = z.object({
  cityId: z.string().min(1, "City is required"),
});

export type UpdateUserCityInput = z.infer<typeof updateUserCitySchema>;

export const updateUserCommissionSchema = z.object({
  commissionPercentage: z
    .number()
    .min(0, "Commission must be at least 0%")
    .max(100, "Commission must be at most 100%"),
});

export type UpdateUserCommissionInput = z.infer<
  typeof updateUserCommissionSchema
>;

export const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Please enter a valid email"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
