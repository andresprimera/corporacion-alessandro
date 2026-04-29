import { z } from "zod/v4";

import {
  onlyActiveQueryShape,
  paginationQuerySchema,
} from "./pagination";

export const warehouseSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  cityId: z.string(),
  cityName: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Warehouse = z.infer<typeof warehouseSchema>;

export const createWarehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cityId: z.string().min(1, "City is required"),
  address: z.string().optional(),
  isActive: z.boolean(),
});
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

export const updateWarehouseSchema = createWarehouseSchema.partial();
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

export const warehouseListQuerySchema = paginationQuerySchema.extend(
  onlyActiveQueryShape,
);
export type WarehouseListQuery = z.infer<typeof warehouseListQuerySchema>;

export const warehouseOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  cityName: z.string().optional(),
});
export type WarehouseOption = z.infer<typeof warehouseOptionSchema>;
