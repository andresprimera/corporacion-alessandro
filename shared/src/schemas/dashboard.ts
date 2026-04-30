import { z } from "zod/v4";
import { currencyEnum } from "./product";
import { commissionReportRowSchema } from "./commission";

export const dashboardRangeEnum = z.enum(["7d", "30d", "90d"]);
export type DashboardRange = z.infer<typeof dashboardRangeEnum>;

export const dashboardSalesTimeseriesQuerySchema = z.object({
  range: dashboardRangeEnum,
});
export type DashboardSalesTimeseriesQuery = z.infer<
  typeof dashboardSalesTimeseriesQuerySchema
>;

export const dashboardTimeseriesPointSchema = z.object({
  date: z.string(),
  total: z.number().nonnegative(),
  count: z.number().int().nonnegative(),
});
export type DashboardTimeseriesPoint = z.infer<
  typeof dashboardTimeseriesPointSchema
>;

export const dashboardSalesTimeseriesResponseSchema = z.object({
  range: dashboardRangeEnum,
  currency: currencyEnum,
  points: z.array(dashboardTimeseriesPointSchema),
});
export type DashboardSalesTimeseriesResponse = z.infer<
  typeof dashboardSalesTimeseriesResponseSchema
>;

export const dashboardCurrencyRevenueSchema = z.object({
  currency: currencyEnum,
  total: z.number().nonnegative(),
});
export type DashboardCurrencyRevenue = z.infer<
  typeof dashboardCurrencyRevenueSchema
>;

export const dashboardRecentSaleSchema = z.object({
  id: z.string(),
  saleNumber: z.string(),
  createdAt: z.string(),
  clientName: z.string(),
  totalAmount: z.number().nonnegative(),
  currency: currencyEnum,
});
export type DashboardRecentSale = z.infer<typeof dashboardRecentSaleSchema>;

export const adminDashboardSummarySchema = z.object({
  role: z.literal("admin"),
  revenueCurrent: z.array(dashboardCurrencyRevenueSchema),
  revenuePrevious: z.array(dashboardCurrencyRevenueSchema),
  saleCountCurrent: z.number().int().nonnegative(),
  saleCountPrevious: z.number().int().nonnegative(),
  activeClientsCount: z.number().int().nonnegative(),
  activeSalesPeopleCount: z.number().int().nonnegative(),
  topSalesPeople: z.array(commissionReportRowSchema),
});
export type AdminDashboardSummary = z.infer<
  typeof adminDashboardSummarySchema
>;

export const salesPersonDashboardSummarySchema = z.object({
  role: z.literal("salesPerson"),
  revenueCurrent: z.array(dashboardCurrencyRevenueSchema),
  revenuePrevious: z.array(dashboardCurrencyRevenueSchema),
  saleCountCurrent: z.number().int().nonnegative(),
  saleCountPrevious: z.number().int().nonnegative(),
  myClientsCount: z.number().int().nonnegative(),
  projectedCommission: z.array(commissionReportRowSchema),
  recentSales: z.array(dashboardRecentSaleSchema),
});
export type SalesPersonDashboardSummary = z.infer<
  typeof salesPersonDashboardSummarySchema
>;

export const userDashboardSummarySchema = z.object({
  role: z.literal("user"),
});
export type UserDashboardSummary = z.infer<typeof userDashboardSummarySchema>;

export const dashboardSummaryResponseSchema = z.discriminatedUnion("role", [
  adminDashboardSummarySchema,
  salesPersonDashboardSummarySchema,
  userDashboardSummarySchema,
]);
export type DashboardSummaryResponse = z.infer<
  typeof dashboardSummaryResponseSchema
>;
