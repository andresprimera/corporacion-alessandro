import {
  type CreateInventoryTransactionInput,
  type InventoryTransaction,
  type PaginatedResponse,
  type ProductStockAggregated,
  type ProductStockByWarehouse,
  type TransactionType,
  type UpdateInventoryTransactionInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

const TRANSACTION_TYPE_LABEL_KEY: Record<TransactionType, string> = {
  inbound: "Inbound",
  outbound: "Outbound",
  adjustment: "Adjustment",
}

export function transactionTypeLabelKey(value: TransactionType): string {
  return TRANSACTION_TYPE_LABEL_KEY[value]
}

export function formatPackagedQty(args: {
  qty: number
  basicUnit?: { name: string }
  packageUnit?: { name: string }
  unitsPerPackage?: number
}): string {
  const { qty, basicUnit, packageUnit, unitsPerPackage: upp } = args
  const basicName = basicUnit?.name
  const packageName = packageUnit?.name
  if (!upp || upp < 2 || !packageName || !basicName) {
    return basicName ? `${qty} ${basicName}` : String(qty)
  }
  const sign = qty < 0 ? "-" : ""
  const abs = Math.abs(qty)
  const packages = Math.floor(abs / upp)
  const loose = abs % upp
  if (packages === 0) return `${sign}${loose} ${basicName}`
  if (loose === 0) return `${sign}${packages} ${packageName}`
  return `${sign}${packages} ${packageName} + ${loose} ${basicName}`
}

export async function fetchInventoryTransactionsApi(
  page: number,
  limit: number,
): Promise<PaginatedResponse<InventoryTransaction>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  const res = await authFetch(`/api/inventory-transactions?${params}`)
  return res.json()
}

export async function createInventoryTransactionApi(
  data: CreateInventoryTransactionInput,
): Promise<InventoryTransaction> {
  const res = await authFetch("/api/inventory-transactions", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateInventoryTransactionApi(
  id: string,
  data: UpdateInventoryTransactionInput,
): Promise<InventoryTransaction> {
  const res = await authFetch(`/api/inventory-transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function removeInventoryTransactionApi(
  id: string,
): Promise<void> {
  await authFetch(`/api/inventory-transactions/${id}`, { method: "DELETE" })
}

export async function fetchStockAggregatedApi(
  page: number,
  limit: number,
): Promise<PaginatedResponse<ProductStockAggregated>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  const res = await authFetch(
    `/api/inventory-transactions/stock/aggregated?${params}`,
  )
  return res.json()
}

export async function fetchStockByWarehouseApi(args: {
  warehouseId?: string
  productId?: string
  page: number
  limit: number
}): Promise<PaginatedResponse<ProductStockByWarehouse>> {
  const params = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  })
  if (args.warehouseId) {
    params.set("warehouseId", args.warehouseId)
  }
  if (args.productId) {
    params.set("productId", args.productId)
  }
  const res = await authFetch(
    `/api/inventory-transactions/stock/by-warehouse?${params}`,
  )
  return res.json()
}
