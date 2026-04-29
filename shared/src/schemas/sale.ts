import { z } from "zod/v4";

import { paginationQuerySchema } from "./pagination";
import { currencyEnum, productKindEnum } from "./product";

export const warehouseAllocationSchema = z.object({
  warehouseId: z.string(),
  warehouseName: z.string(),
  qty: z.number().int().positive("Quantity must be positive"),
});
export type WarehouseAllocation = z.infer<typeof warehouseAllocationSchema>;

export const saleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productKind: productKindEnum,
  requestedQty: z.number().int().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be zero or greater"),
  currency: currencyEnum,
  allocations: z.array(warehouseAllocationSchema).min(1, "At least one warehouse is required"),
});
export type SaleItem = z.infer<typeof saleItemSchema>;

export const saleSoldBySchema = z.object({
  userId: z.string(),
  name: z.string(),
});
export type SaleSoldBy = z.infer<typeof saleSoldBySchema>;

export const saleSchema = z.object({
  id: z.string(),
  saleNumber: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  notes: z.string().optional(),
  items: z.array(saleItemSchema),
  totalQty: z.number(),
  totalAmount: z.number(),
  currency: currencyEnum,
  soldBy: saleSoldBySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Sale = z.infer<typeof saleSchema>;

const saleItemInputBase = z.object({
  productId: z.string().min(1, "Product is required"),
  requestedQty: z.number().int().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be zero or greater"),
  allocations: z
    .array(
      z.object({
        warehouseId: z.string().min(1, "Warehouse is required"),
        qty: z.number().int().positive("Quantity must be positive"),
      }),
    )
    .min(1, "At least one warehouse is required"),
});

const saleItemInputSchema = saleItemInputBase.refine(
  (item) => item.allocations.reduce((sum, a) => sum + a.qty, 0) === item.requestedQty,
  {
    message: "Allocation quantities must sum to the requested quantity",
    path: ["allocations"],
  },
);
export type SaleItemInput = z.infer<typeof saleItemInputSchema>;

export const createSaleSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  notes: z.string().optional(),
  items: z.array(saleItemInputSchema).min(1, "At least one item is required"),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const updateSaleSchema = z.object({
  notes: z.string().optional(),
});
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;

export const saleListQuerySchema = paginationQuerySchema;
export type SaleListQuery = z.infer<typeof saleListQuerySchema>;
