import {
  type CreateExchangeRateInput,
  type ExchangeRate,
  type PaginatedResponse,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchExchangeRatesApi(
  page: number,
  limit: number,
): Promise<PaginatedResponse<ExchangeRate>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  const res = await authFetch(`/api/exchange-rates?${params}`)
  return res.json()
}

export async function createExchangeRateApi(
  data: CreateExchangeRateInput,
): Promise<ExchangeRate> {
  const res = await authFetch("/api/exchange-rates", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}
