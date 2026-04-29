import { createBrowserRouter } from "react-router"
import LandingPage from "@/pages/landing"
import DashboardPage from "@/pages/dashboard"
import UsersPage from "@/pages/users"
import ProductsPage from "@/pages/products"
import CitiesPage from "@/pages/cities"
import WarehousesPage from "@/pages/warehouses"
import InventoryPage from "@/pages/inventory"
import StockPage from "@/pages/stock"
import SalesPage from "@/pages/sales"
import LoginPage from "@/pages/login"
import SignupPage from "@/pages/signup"
import ForgotPasswordPage from "@/pages/forgot-password"
import ResetPasswordPage from "@/pages/reset-password"
import SettingsPage from "@/pages/settings"
import { ProtectedRoute } from "@/components/protected-route"
import { AdminRoute } from "@/components/admin-route"
import { RoleRoute } from "@/components/role-route"
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
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
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
      {
        path: "products",
        element: (
          <AdminRoute>
            <ProductsPage />
          </AdminRoute>
        ),
      },
      {
        path: "cities",
        element: (
          <AdminRoute>
            <CitiesPage />
          </AdminRoute>
        ),
      },
      {
        path: "warehouses",
        element: (
          <AdminRoute>
            <WarehousesPage />
          </AdminRoute>
        ),
      },
      {
        path: "inventory",
        element: (
          <AdminRoute>
            <InventoryPage />
          </AdminRoute>
        ),
      },
      {
        path: "stock",
        element: (
          <AdminRoute>
            <StockPage />
          </AdminRoute>
        ),
      },
      {
        path: "sales",
        element: (
          <RoleRoute allowed={["admin", "salesPerson"]}>
            <SalesPage />
          </RoleRoute>
        ),
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
])
