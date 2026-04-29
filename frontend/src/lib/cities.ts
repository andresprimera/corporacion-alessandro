import {
  type City,
  type CityOption,
  type PaginatedResponse,
  type CreateCityInput,
  type UpdateCityInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchCitiesApi(
  page: number,
  limit: number,
  opts?: { onlyActive?: boolean },
): Promise<PaginatedResponse<City>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (opts?.onlyActive) {
    params.set("onlyActive", "true")
  }
  const res = await authFetch(`/api/cities?${params}`)
  return res.json()
}

export async function createCityApi(data: CreateCityInput): Promise<City> {
  const res = await authFetch("/api/cities", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateCityApi(
  id: string,
  data: UpdateCityInput,
): Promise<City> {
  const res = await authFetch(`/api/cities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function removeCityApi(id: string): Promise<void> {
  await authFetch(`/api/cities/${id}`, { method: "DELETE" })
}

export async function fetchCityOptionsApi(): Promise<CityOption[]> {
  const res = await authFetch("/api/cities/options")
  return res.json()
}
