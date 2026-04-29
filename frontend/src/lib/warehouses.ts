import {
  type Warehouse,
  type WarehouseOption,
  type PaginatedResponse,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchWarehousesApi(
  page: number,
  limit: number,
  opts?: { onlyActive?: boolean },
): Promise<PaginatedResponse<Warehouse>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (opts?.onlyActive) {
    params.set("onlyActive", "true")
  }
  const res = await authFetch(`/api/warehouses?${params}`)
  return res.json()
}

export async function createWarehouseApi(
  data: CreateWarehouseInput,
): Promise<Warehouse> {
  const res = await authFetch("/api/warehouses", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateWarehouseApi(
  id: string,
  data: UpdateWarehouseInput,
): Promise<Warehouse> {
  const res = await authFetch(`/api/warehouses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function removeWarehouseApi(id: string): Promise<void> {
  await authFetch(`/api/warehouses/${id}`, { method: "DELETE" })
}

export async function fetchWarehouseOptionsApi(): Promise<WarehouseOption[]> {
  const res = await authFetch("/api/warehouses/options")
  return res.json()
}
