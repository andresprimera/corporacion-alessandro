import {
  type Presentation,
  type PresentationOption,
  type PaginatedResponse,
  type CreatePresentationInput,
  type UpdatePresentationInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchPresentationsApi(
  page: number,
  limit: number,
  opts?: { search?: string },
): Promise<PaginatedResponse<Presentation>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (opts?.search) {
    params.set("search", opts.search)
  }
  const res = await authFetch(`/api/presentations?${params}`)
  return res.json()
}

export async function fetchPresentationOptionsApi(): Promise<
  PresentationOption[]
> {
  const res = await authFetch("/api/presentations/options")
  return res.json()
}

export async function createPresentationApi(
  data: CreatePresentationInput,
): Promise<Presentation> {
  const res = await authFetch("/api/presentations", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updatePresentationApi(
  id: string,
  data: UpdatePresentationInput,
): Promise<Presentation> {
  const res = await authFetch(`/api/presentations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function removePresentationApi(id: string): Promise<void> {
  await authFetch(`/api/presentations/${id}`, { method: "DELETE" })
}
