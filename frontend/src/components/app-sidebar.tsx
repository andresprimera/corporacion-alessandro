import * as React from "react"
import { useTranslation } from "react-i18next"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  UsersIcon,
  Settings2Icon,
  CommandIcon,
  PackageIcon,
  MapPinIcon,
  WarehouseIcon,
  BoxesIcon,
  BarChart3Icon,
  ReceiptIcon,
  ContactIcon,
  ShoppingCartIcon,
  PercentIcon,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Link } from "react-router"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()
  const isAdmin = user?.role === "admin"
  const isSalesPerson = user?.role === "salesPerson"

  const handleNav = (): void => {
    if (isMobile) setOpenMobile(false)
  }

  const adminNavMain = [
    { title: t("Dashboard"), url: "/dashboard", icon: <LayoutDashboardIcon /> },
    { title: t("Users"), url: "/dashboard/users", icon: <UsersIcon /> },
    { title: t("Products"), url: "/dashboard/products", icon: <PackageIcon /> },
    { title: t("Cities"), url: "/dashboard/cities", icon: <MapPinIcon /> },
    { title: t("Warehouses"), url: "/dashboard/warehouses", icon: <WarehouseIcon /> },
    { title: t("Inventory"), url: "/dashboard/inventory", icon: <BoxesIcon /> },
    { title: t("Stock"), url: "/dashboard/stock", icon: <BarChart3Icon /> },
    { title: t("Clients"), url: "/dashboard/clients", icon: <ContactIcon /> },
    { title: t("Catalog"), url: "/dashboard/catalog", icon: <ShoppingCartIcon /> },
    { title: t("Sales"), url: "/dashboard/sales", icon: <ReceiptIcon /> },
    { title: t("Commissions"), url: "/dashboard/commissions", icon: <PercentIcon /> },
  ]

  const salesPersonNavMain = [
    { title: t("Dashboard"), url: "/dashboard", icon: <LayoutDashboardIcon /> },
    { title: t("My Clients"), url: "/dashboard/clients", icon: <ContactIcon /> },
    { title: t("Catalog"), url: "/dashboard/catalog", icon: <ShoppingCartIcon /> },
    { title: t("Sales"), url: "/dashboard/sales", icon: <ReceiptIcon /> },
    { title: t("My Commissions"), url: "/dashboard/commissions", icon: <PercentIcon /> },
  ]

  const userNavMain = [
    { title: t("Dashboard"), url: "/dashboard", icon: <LayoutDashboardIcon /> },
  ]

  const navSecondary = [
    { title: t("Settings"), url: "/dashboard/settings", icon: <Settings2Icon /> },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link to="/dashboard" onClick={handleNav} />}
            >
              <CommandIcon className="size-5!" />
              <span className="font-display text-xl font-semibold italic tracking-wide">
                Alessandro Corp
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={
            isAdmin
              ? adminNavMain
              : isSalesPerson
                ? salesPersonNavMain
                : userNavMain
          }
        />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
