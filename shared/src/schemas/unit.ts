import { z } from "zod/v4";

import { paginationQuerySchema } from "./pagination";

export const unitSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must be 10 characters or fewer"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Unit = z.infer<typeof unitSchema>;

export const createUnitSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must be 10 characters or fewer")
    .trim(),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = createUnitSchema.partial();
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export const unitListQuerySchema = paginationQuerySchema.extend({
  search: z.string().min(1).optional(),
});
export type UnitListQuery = z.infer<typeof unitListQuerySchema>;

export const unitOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
});
export type UnitOption = z.infer<typeof unitOptionSchema>;

export const unitRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
});
export type UnitRef = z.infer<typeof unitRefSchema>;
