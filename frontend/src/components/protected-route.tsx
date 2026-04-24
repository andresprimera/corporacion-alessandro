import { Navigate } from "react-router"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/hooks/use-auth"
import type { ReactNode } from "react"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">{t("Loading...")}</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}
