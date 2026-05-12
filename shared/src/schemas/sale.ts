import { z } from "zod/v4";

import { paginationQuerySchema } from "./pagination";
import { currencyEnum, productKindEnum } from "./product";
import { unitRefSchema } from "./unit";

export const saleStatusEnum = z.enum([
  "placed",
  "paid",
  "confirmed",
  "payment_rejected",
]);
export type SaleStatus = z.infer<typeof saleStatusEnum>;

export const paymentTypeEnum = z.enum(["pago_movil", "bank_transfer"]);
export type PaymentType = z.infer<typeof paymentTypeEnum>;

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
  enteredQty: z.number().int().positive().optional(),
  enteredUnit: unitRefSchema.optional(),
  unitsPerPackageAtEntry: z.number().int().optional(),
  allocations: z.array(warehouseAllocationSchema).min(1, "At least one warehouse is required"),
});
export type SaleItem = z.infer<typeof saleItemSchema>;

export const saleSoldBySchema = z.object({
  userId: z.string(),
  name: z.string(),
});
export type SaleSoldBy = z.infer<typeof saleSoldBySchema>;

export const paymentProofSchema = z.object({
  imageKey: z.string(),
  imageMimeType: z.string(),
  bank: z.string(),
  paymentType: paymentTypeEnum,
  paymentNumber: z.string(),
  paymentDate: z.string(),
  paidAmount: z.number(),
  submittedAt: z.string(),
});
export type PaymentProof = z.infer<typeof paymentProofSchema>;

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
  status: saleStatusEnum,
  paymentProof: paymentProofSchema.optional(),
  soldBy: saleSoldBySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Sale = z.infer<typeof saleSchema>;

const saleItemInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  enteredQty: z.number().int().positive("Quantity must be positive"),
  enteredUnitId: z.string().min(1, "Unit is required"),
  unitPrice: z.number().nonnegative("Unit price must be zero or greater"),
});
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

export const updateSaleStatusSchema = z.object({
  status: z.enum(["confirmed", "payment_rejected"]),
});
export type UpdateSaleStatusInput = z.infer<typeof updateSaleStatusSchema>;

export const submitPaymentSchema = z.object({
  bank: z.string().min(1, "Bank is required"),
  paymentType: paymentTypeEnum,
  paymentNumber: z.string().min(1, "Payment number is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paidAmount: z.number().positive("Paid amount must be greater than 0"),
});
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;

export const saleListQuerySchema = paginationQuerySchema;
export type SaleListQuery = z.infer<typeof saleListQuerySchema>;
