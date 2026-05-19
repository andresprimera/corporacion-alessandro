import { z } from "zod/v4";

export const exchangeRateSchema = z.object({
  id: z.string(),
  rateDate: z.string(),
  value: z.number().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExchangeRate = z.infer<typeof exchangeRateSchema>;

export const createExchangeRateSchema = z.object({
  rateDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  value: z.number().positive("Value must be greater than zero"),
});
export type CreateExchangeRateInput = z.infer<typeof createExchangeRateSchema>;
