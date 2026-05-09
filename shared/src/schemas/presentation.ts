import { z } from "zod/v4";

import { paginationQuerySchema } from "./pagination";

export const presentationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must be 10 characters or fewer"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Presentation = z.infer<typeof presentationSchema>;

export const createPresentationSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must be 10 characters or fewer")
    .trim(),
});
export type CreatePresentationInput = z.infer<typeof createPresentationSchema>;

export const updatePresentationSchema = createPresentationSchema.partial();
export type UpdatePresentationInput = z.infer<typeof updatePresentationSchema>;

export const presentationListQuerySchema = paginationQuerySchema.extend({
  search: z.string().min(1).optional(),
});
export type PresentationListQuery = z.infer<typeof presentationListQuerySchema>;

export const presentationOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
});
export type PresentationOption = z.infer<typeof presentationOptionSchema>;

export const presentationRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
});
export type PresentationRef = z.infer<typeof presentationRefSchema>;
