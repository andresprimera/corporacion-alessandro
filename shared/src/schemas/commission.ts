import { z } from "zod/v4";
import { currencyEnum } from "./product";

export const commissionReportQuerySchema = z.object({
  from: z.iso.datetime({ message: "from must be an ISO datetime" }),
  to: z.iso.datetime({ message: "to must be an ISO datetime" }),
});
export type CommissionReportQuery = z.infer<typeof commissionReportQuerySchema>;

export const commissionReportRowSchema = z.object({
  salesPersonId: z.string(),
  salesPersonName: z.string(),
  currency: currencyEnum,
  totalAmount: z.number().nonnegative(),
  saleCount: z.number().int().nonnegative(),
  commissionPercentage: z.number().min(0).max(100),
  commissionAmount: z.number().nonnegative(),
});
export type CommissionReportRow = z.infer<typeof commissionReportRowSchema>;

export const commissionReportResponseSchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  rows: z.array(commissionReportRowSchema),
});
export type CommissionReportResponse = z.infer<
  typeof commissionReportResponseSchema
>;
