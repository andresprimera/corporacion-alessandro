import {
  type CreateSaleInput,
  type DispatchSummaryResponse,
  type PaginatedResponse,
  type PaymentType,
  type Sale,
  type UpdateSaleInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export function cartItemBasicQty(item: {
  enteredQty: number
  isPackage: boolean
  unitsPerPackage?: number
}): number {
  return item.isPackage && item.unitsPerPackage
    ? item.enteredQty * item.unitsPerPackage
    : item.enteredQty
}

export async function fetchSalesApi(
  page: number,
  limit: number,
  opts?: { soldByUserId?: string },
): Promise<PaginatedResponse<Sale>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (opts?.soldByUserId) {
    params.set("soldByUserId", opts.soldByUserId)
  }
  const res = await authFetch(`/api/sales?${params}`)
  return res.json()
}

export async function fetchSaleApi(id: string): Promise<Sale> {
  const res = await authFetch(`/api/sales/${id}`)
  return res.json()
}

export async function fetchDispatchSummaryApi(
  soldByUserId: string,
): Promise<DispatchSummaryResponse> {
  const params = new URLSearchParams({ soldByUserId })
  const res = await authFetch(`/api/sales/dispatch-summary?${params}`)
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

export async function updateSaleStatusApi(
  id: string,
  status: "confirmed" | "payment_rejected",
): Promise<Sale> {
  const res = await authFetch(`/api/sales/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
  return res.json()
}

export async function markSaleDeliveredApi(id: string): Promise<Sale> {
  const res = await authFetch(`/api/sales/${id}/delivery`, {
    method: "PATCH",
    body: JSON.stringify({ delivered: true }),
  })
  return res.json()
}

export async function submitSalePaymentApi(
  id: string,
  input: {
    image: File
    bank: string
    paymentType: PaymentType
    paymentNumber: string
    paymentDate: string
    paidAmount: number
  },
): Promise<Sale> {
  const formData = new FormData()
  formData.append("image", input.image)
  formData.append("bank", input.bank)
  formData.append("paymentType", input.paymentType)
  formData.append("paymentNumber", input.paymentNumber)
  formData.append("paymentDate", input.paymentDate)
  formData.append("paidAmount", String(input.paidAmount))
  const res = await authFetch(`/api/sales/${id}/payment`, {
    method: "POST",
    body: formData,
  })
  return res.json()
}

export async function downloadPaymentProofApi(
  id: string,
): Promise<{ blob: Blob; mimeType: string }> {
  const res = await authFetch(`/api/sales/${id}/payment-proof`)
  const blob = await res.blob()
  const mimeType =
    res.headers.get("content-type") ?? "application/octet-stream"
  return { blob, mimeType }
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
