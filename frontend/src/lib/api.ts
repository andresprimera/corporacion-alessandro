import { type AuthResponse } from "@base-dashboard/shared"

const TOKEN_KEYS = {
  access: "accessToken",
  refresh: "refreshToken",
} as const

export function getStoredTokens(): {
  accessToken: string | null
  refreshToken: string | null
} {
  return {
    accessToken: localStorage.getItem(TOKEN_KEYS.access),
    refreshToken: localStorage.getItem(TOKEN_KEYS.refresh),
  }
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEYS.access, accessToken)
  localStorage.setItem(TOKEN_KEYS.refresh, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEYS.access)
  localStorage.removeItem(TOKEN_KEYS.refresh)
}

// --- Refresh queue ---
let refreshPromise: Promise<AuthResponse> | null = null

async function refreshTokens(): Promise<AuthResponse> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const { refreshToken } = getStoredTokens()
    if (!refreshToken) {
      throw new Error("No refresh token")
    }

    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    })

    if (!res.ok) {
      clearTokens()
      throw new Error("Refresh failed")
    }

    const data: AuthResponse = await res.json()
    storeTokens(data.accessToken, data.refreshToken)
    return data
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

// --- Fetch helpers ---

export async function publicFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
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

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const { accessToken } = getStoredTokens()

  const makeRequest = (token: string | null): Promise<Response> =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

  const res = await makeRequest(accessToken)

  if (res.status === 401) {
    try {
      const { accessToken: newToken } = await refreshTokens()
      const retryRes = await makeRequest(newToken)
      if (!retryRes.ok) {
        const body = await retryRes.json().catch(() => ({}))
        throw new Error(body.message || "Request failed")
      }
      return retryRes
    } catch {
      clearTokens()
      window.location.href = "/login"
      throw new Error("Session expired")
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || "Request failed")
  }

  return res
}
