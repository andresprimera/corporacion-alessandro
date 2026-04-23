import { Navigate } from "react-router"
import { useAuth } from "@/hooks/use-auth"
import type { ReactNode } from "react"

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
