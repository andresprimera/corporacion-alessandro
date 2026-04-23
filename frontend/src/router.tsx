import { createBrowserRouter } from "react-router"
import LandingPage from "@/pages/landing"
import DashboardPage from "@/pages/dashboard"
import UsersPage from "@/pages/users"
import LoginPage from "@/pages/login"
import SignupPage from "@/pages/signup"
import { ProtectedRoute } from "@/components/protected-route"
import { AdminRoute } from "@/components/admin-route"
import { DashboardLayout } from "@/components/dashboard-layout"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "users",
        element: (
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        ),
      },
    ],
  },
])
