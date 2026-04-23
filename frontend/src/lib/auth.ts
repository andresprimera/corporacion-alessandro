import { type AuthResponse, type User } from "@base-dashboard/shared"

export type AuthUser = User
export type { AuthResponse }

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || "Request failed")
  }
  return res
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  return res.json()
}

export async function signupApi(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await authFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  })
  return res.json()
}

export async function refreshApi(refreshToken: string): Promise<AuthResponse> {
  const res = await authFetch("/api/auth/refresh", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  })
  return res.json()
}

export async function logoutApi(accessToken: string): Promise<void> {
  await authFetch("/api/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

export async function fetchUsersApi(accessToken: string): Promise<AuthUser[]> {
  const res = await authFetch("/api/users", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.json()
}

export async function updateUserRoleApi(
  accessToken: string,
  userId: string,
  role: string,
): Promise<AuthUser> {
  const res = await authFetch(`/api/users/${userId}/role`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ role }),
  })
  return res.json()
}

export async function deleteUserApi(
  accessToken: string,
  userId: string,
): Promise<void> {
  await authFetch(`/api/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
