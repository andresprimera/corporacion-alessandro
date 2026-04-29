import {
  type CreateSaleInput,
  type PaginatedResponse,
  type Sale,
  type UpdateSaleInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchSalesApi(
  page: number,
  limit: number,
): Promise<PaginatedResponse<Sale>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  const res = await authFetch(`/api/sales?${params}`)
  return res.json()
}

export async function fetchSaleApi(id: string): Promise<Sale> {
  const res = await authFetch(`/api/sales/${id}`)
  return res.json()
}

export async function createSaleApi(data: CreateSaleInput): Promise<Sale> {
  const res = await authFetch("/api/sales", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateSaleApi(
  id: string,
  data: UpdateSaleInput,
): Promise<Sale> {
  const res = await authFetch(`/api/sales/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function removeSaleApi(id: string): Promise<void> {
  await authFetch(`/api/sales/${id}`, { method: "DELETE" })
}
