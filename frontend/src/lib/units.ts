import {
  type Unit,
  type UnitOption,
  type PaginatedResponse,
  type CreateUnitInput,
  type UpdateUnitInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchUnitsApi(
  page: number,
  limit: number,
  opts?: { search?: string },
): Promise<PaginatedResponse<Unit>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (opts?.search) {
    params.set("search", opts.search)
  }
  const res = await authFetch(`/api/units?${params}`)
  return res.json()
}

export async function fetchUnitOptionsApi(): Promise<UnitOption[]> {
  const res = await authFetch("/api/units/options")
  return res.json()
}

export async function createUnitApi(data: CreateUnitInput): Promise<Unit> {
  const res = await authFetch("/api/units", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateUnitApi(
  id: string,
  data: UpdateUnitInput,
): Promise<Unit> {
  const res = await authFetch(`/api/units/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function removeUnitApi(id: string): Promise<void> {
  await authFetch(`/api/units/${id}`, { method: "DELETE" })
}
