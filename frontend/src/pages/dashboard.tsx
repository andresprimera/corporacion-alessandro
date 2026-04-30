import { useAuth } from "@/hooks/use-auth"
import { AdminDashboard } from "@/components/admin-dashboard"
import { SalesPersonDashboard } from "@/components/sales-person-dashboard"
import { UserDashboard } from "@/components/user-dashboard"

export default function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role === "admin") return <AdminDashboard />
  if (user.role === "salesPerson") return <SalesPersonDashboard />
  return <UserDashboard />
}
