import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Outlet } from "react-router"
import { SaleCartProvider } from "@/hooks/use-sale-cart"
import { SaleCartDrawer } from "@/components/sale-cart-drawer"

export function DashboardLayout() {
  return (
    <SaleCartProvider>
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Outlet />
          </div>
        </SidebarInset>
        <SaleCartDrawer />
      </SidebarProvider>
    </SaleCartProvider>
  )
}
