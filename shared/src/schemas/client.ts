import { z } from "zod/v4";

import { paginationQuerySchema } from "./pagination";

export const clientSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  rif: z.string().min(1, "RIF is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone is required"),
  salesPersonId: z.string(),
  salesPersonName: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Client = z.infer<typeof clientSchema>;

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  rif: z.string().min(1, "RIF is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone is required"),
  salesPersonId: z.string().optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const clientListQuerySchema = paginationQuerySchema.extend({
  salesPersonId: z.string().optional(),
});
export type ClientListQuery = z.infer<typeof clientListQuerySchema>;

export const salesPersonOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type SalesPersonOption = z.infer<typeof salesPersonOptionSchema>;

export const clientOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  rif: z.string(),
});
export type ClientOption = z.infer<typeof clientOptionSchema>;
