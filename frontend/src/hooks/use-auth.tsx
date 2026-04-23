import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import {
  loginApi,
  signupApi,
  refreshApi,
  logoutApi,
  type AuthUser,
} from "@/lib/auth"

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEYS = {
  access: "accessToken",
  refresh: "refreshToken",
} as const

function getStoredTokens() {
  return {
    accessToken: localStorage.getItem(TOKEN_KEYS.access),
    refreshToken: localStorage.getItem(TOKEN_KEYS.refresh),
  }
}

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEYS.access, accessToken)
  localStorage.setItem(TOKEN_KEYS.refresh, refreshToken)
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEYS.access)
  localStorage.removeItem(TOKEN_KEYS.refresh)
}

// Decode JWT payload to get expiration time
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRefresh = useCallback((accessToken: string, refreshToken: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }

    const expiry = getTokenExpiry(accessToken)
    if (!expiry) return

    // Refresh 1 minute before expiry
    const delay = Math.max(expiry - Date.now() - 60_000, 0)

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const data = await refreshApi(refreshToken)
        storeTokens(data.accessToken, data.refreshToken)
        setUser(data.user)
        scheduleRefresh(data.accessToken, data.refreshToken)
      } catch {
        clearTokens()
        setUser(null)
      }
    }, delay)
  }, [])

  // On mount: try to restore session from stored refresh token
  useEffect(() => {
    const { refreshToken } = getStoredTokens()
    if (!refreshToken) {
      setIsLoading(false)
      return
    }

    refreshApi(refreshToken)
      .then((data) => {
        storeTokens(data.accessToken, data.refreshToken)
        setUser(data.user)
        scheduleRefresh(data.accessToken, data.refreshToken)
      })
      .catch(() => {
        clearTokens()
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [scheduleRefresh])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginApi(email, password)
    storeTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    scheduleRefresh(data.accessToken, data.refreshToken)
  }, [scheduleRefresh])

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const data = await signupApi(name, email, password)
    storeTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    scheduleRefresh(data.accessToken, data.refreshToken)
  }, [scheduleRefresh])

  const getAccessToken = useCallback(() => {
    return localStorage.getItem(TOKEN_KEYS.access)
  }, [])

  const logout = useCallback(async () => {
    const { accessToken } = getStoredTokens()
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    clearTokens()
    setUser(null)
    if (accessToken) {
      await logoutApi(accessToken).catch(() => {})
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
