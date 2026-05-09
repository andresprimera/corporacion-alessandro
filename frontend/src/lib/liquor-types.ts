import {
  type LiquorType,
  type LiquorTypeOption,
  type PaginatedResponse,
  type CreateLiquorTypeInput,
  type UpdateLiquorTypeInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchLiquorTypesApi(
  page: number,
  limit: number,
  opts?: { search?: string },
): Promise<PaginatedResponse<LiquorType>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (opts?.search) {
    params.set("search", opts.search)
  }
  const res = await authFetch(`/api/liquor-types?${params}`)
  return res.json()
}

export async function fetchLiquorTypeOptionsApi(): Promise<LiquorTypeOption[]> {
  const res = await authFetch("/api/liquor-types/options")
  return res.json()
}

export async function createLiquorTypeApi(
  data: CreateLiquorTypeInput,
): Promise<LiquorType> {
  const res = await authFetch("/api/liquor-types", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateLiquorTypeApi(
  id: string,
  data: UpdateLiquorTypeInput,
): Promise<LiquorType> {
  const res = await authFetch(`/api/liquor-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function removeLiquorTypeApi(id: string): Promise<void> {
  await authFetch(`/api/liquor-types/${id}`, { method: "DELETE" })
}
