import { Navigate } from "react-router"
import { useAuth } from "@/hooks/use-auth"
import type { Role } from "@base-dashboard/shared"
import type { ReactNode } from "react"

export function RoleRoute({
  allowed,
  children,
}: {
  allowed: Role[]
  children: ReactNode
}) {
  const { user } = useAuth()

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
