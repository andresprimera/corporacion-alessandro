import { z } from "zod/v4";

import { paginationQuerySchema } from "./pagination";

export const liquorTypeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must be 10 characters or fewer"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LiquorType = z.infer<typeof liquorTypeSchema>;

export const createLiquorTypeSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must be 10 characters or fewer")
    .trim(),
});
export type CreateLiquorTypeInput = z.infer<typeof createLiquorTypeSchema>;

export const updateLiquorTypeSchema = createLiquorTypeSchema.partial();
export type UpdateLiquorTypeInput = z.infer<typeof updateLiquorTypeSchema>;

export const liquorTypeListQuerySchema = paginationQuerySchema.extend({
  search: z.string().min(1).optional(),
});
export type LiquorTypeListQuery = z.infer<typeof liquorTypeListQuerySchema>;

export const liquorTypeOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
});
export type LiquorTypeOption = z.infer<typeof liquorTypeOptionSchema>;

export const liquorTypeRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
});
export type LiquorTypeRef = z.infer<typeof liquorTypeRefSchema>;
