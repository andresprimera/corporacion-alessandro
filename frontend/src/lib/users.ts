import { type User } from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchUsersApi(): Promise<User[]> {
  const res = await authFetch("/api/users")
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

export async function deleteUserApi(userId: string): Promise<void> {
  await authFetch(`/api/users/${userId}`, { method: "DELETE" })
}
