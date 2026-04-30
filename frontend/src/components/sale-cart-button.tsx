import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/hooks/use-auth"
import { useSaleCart } from "@/hooks/use-sale-cart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCartIcon } from "lucide-react"

export function SaleCartButton(): ReactElement | null {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { totalQty, openDrawer } = useSaleCart()

  const role = user?.role
  if (role !== "admin" && role !== "salesPerson") return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={openDrawer}
      aria-label={t("Open order cart")}
      className="relative"
    >
      <ShoppingCartIcon className="size-4" />
      {totalQty > 0 && (
        <Badge
          variant="default"
          className="absolute -right-1 -top-1 size-4 min-w-4 justify-center rounded-full p-0 text-[10px]"
        >
          {totalQty > 99 ? "99+" : totalQty}
        </Badge>
      )}
    </Button>
  )
}
