import { z } from "zod/v4";

import {
  onlyActiveQueryShape,
  paginationQuerySchema,
} from "./pagination";

export const citySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type City = z.infer<typeof citySchema>;

export const createCitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  isActive: z.boolean(),
});
export type CreateCityInput = z.infer<typeof createCitySchema>;

export const updateCitySchema = createCitySchema.partial();
export type UpdateCityInput = z.infer<typeof updateCitySchema>;

export const cityListQuerySchema = paginationQuerySchema.extend(
  onlyActiveQueryShape,
);
export type CityListQuery = z.infer<typeof cityListQuerySchema>;

export const cityOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type CityOption = z.infer<typeof cityOptionSchema>;
