import { z } from "zod/v4";

import { paginationQuerySchema } from "./pagination";
import { productKindEnum } from "./product";

export const transactionTypeEnum = z.enum([
  "inbound",
  "outbound",
  "adjustment",
]);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

export const inventoryTransactionCreatedBySchema = z.object({
  userId: z.string(),
  name: z.string(),
});
export type InventoryTransactionCreatedBy = z.infer<typeof inventoryTransactionCreatedBySchema>;

export const inventoryTransactionSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  productName: z.string().optional(),
  productKind: productKindEnum.optional(),
  warehouseName: z.string().optional(),
  transactionType: transactionTypeEnum,
  batch: z.string().min(1, "Batch is required"),
  qty: z.number(),
  notes: z.string().optional(),
  expirationDate: z.string().optional(),
  createdBy: inventoryTransactionCreatedBySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InventoryTransaction = z.infer<typeof inventoryTransactionSchema>;

const isParseableDate = (value: string): boolean =>
  value === "" || !Number.isNaN(Date.parse(value));

const inventoryTransactionInputBase = z.object({
  productId: z.string().min(1, "Product is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  transactionType: transactionTypeEnum,
  batch: z.string().min(1, "Batch is required"),
  qty: z.number(),
  notes: z.string().optional(),
  expirationDate: z
    .string()
    .refine(isParseableDate, "Invalid expiration date")
    .optional(),
});

function refineQty(
  data: { qty: number; transactionType: TransactionType },
  ctx: z.RefinementCtx,
): void {
  if (data.qty === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Quantity must not be zero",
      path: ["qty"],
    });
    return;
  }
  if (
    (data.transactionType === "inbound" ||
      data.transactionType === "outbound") &&
    data.qty < 0
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Quantity must be positive for inbound and outbound transactions",
      path: ["qty"],
    });
  }
}

export const createInventoryTransactionSchema =
  inventoryTransactionInputBase.superRefine(refineQty);
export type CreateInventoryTransactionInput = z.infer<
  typeof createInventoryTransactionSchema
>;

export const updateInventoryTransactionSchema = inventoryTransactionInputBase
  .partial()
  .superRefine((data, ctx) => {
    if (data.qty === undefined || data.transactionType === undefined) {
      return;
    }
    refineQty(
      { qty: data.qty, transactionType: data.transactionType },
      ctx,
    );
  });
export type UpdateInventoryTransactionInput = z.infer<
  typeof updateInventoryTransactionSchema
>;

export const productStockByWarehouseSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productKind: productKindEnum,
  warehouseId: z.string(),
  warehouseName: z.string(),
  totalQty: z.number(),
});
export type ProductStockByWarehouse = z.infer<
  typeof productStockByWarehouseSchema
>;

export const productStockAggregatedSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productKind: productKindEnum,
  totalQty: z.number(),
});
export type ProductStockAggregated = z.infer<
  typeof productStockAggregatedSchema
>;

export const stockByWarehouseQuerySchema = paginationQuerySchema.extend({
  warehouseId: z.string().optional(),
});
export type StockByWarehouseQuery = z.infer<typeof stockByWarehouseQuerySchema>;
