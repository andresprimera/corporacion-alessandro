import {
  type User,
  type PaginatedResponse,
  type CreateUserInput,
  type SalesPersonOption,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchUsersApi(
  page: number,
  limit: number,
): Promise<PaginatedResponse<User>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  const res = await authFetch(`/api/users?${params}`)
  return res.json()
}

export async function updateUserRoleApi(
  userId: string,
  role: string,
): Promise<User> {
  const res = await authFetch(`/api/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  })
  return res.json()
}

export async function updateUserStatusApi(
  userId: string,
  status: string,
): Promise<User> {
  const res = await authFetch(`/api/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
  return res.json()
}

export async function updateUserCityApi(
  userId: string,
  cityId: string,
): Promise<User> {
  const res = await authFetch(`/api/users/${userId}/city`, {
    method: "PATCH",
    body: JSON.stringify({ cityId }),
  })
  return res.json()
}

export async function removeUserApi(userId: string): Promise<void> {
  await authFetch(`/api/users/${userId}`, { method: "DELETE" })
}

export async function createUserApi(data: CreateUserInput): Promise<User> {
  const res = await authFetch("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}

export const salesPersonOptionsQueryKey = [
  "users",
  "sales-persons",
  "options",
] as const

export async function fetchSalesPersonOptionsApi(): Promise<
  SalesPersonOption[]
> {
  const res = await authFetch("/api/users/sales-persons/options")
  return res.json()
}
