import {
  type Client,
  type ClientOption,
  type CreateClientInput,
  type PaginatedResponse,
  type UpdateClientInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchClientsApi(
  page: number,
  limit: number,
  opts?: { salesPersonId?: string },
): Promise<PaginatedResponse<Client>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (opts?.salesPersonId) {
    params.set("salesPersonId", opts.salesPersonId)
  }
  const res = await authFetch(`/api/clients?${params}`)
  return res.json()
}

export async function createClientApi(
  data: CreateClientInput,
): Promise<Client> {
  const res = await authFetch("/api/clients", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateClientApi(
  id: string,
  data: UpdateClientInput,
): Promise<Client> {
  const res = await authFetch(`/api/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function removeClientApi(id: string): Promise<void> {
  await authFetch(`/api/clients/${id}`, { method: "DELETE" })
}

export async function fetchClientOptionsApi(): Promise<ClientOption[]> {
  const res = await authFetch("/api/clients/options")
  return res.json()
}
