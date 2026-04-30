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

export async function downloadDeliveryOrderApi(id: string): Promise<void> {
  const res = await authFetch(`/api/sales/${id}/delivery-order`)
  await triggerDownload(res, `orden-entrega-${id}.pdf`)
}

export async function downloadInvoiceApi(id: string): Promise<void> {
  const res = await authFetch(`/api/sales/${id}/invoice`)
  await triggerDownload(res, `factura-${id}.pdf`)
}

async function triggerDownload(
  res: Response,
  fallbackName: string,
): Promise<void> {
  const blob = await res.blob()
  const cd = res.headers.get("content-disposition") ?? ""
  const match = cd.match(/filename="?([^"]+)"?/)
  const name = match?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
