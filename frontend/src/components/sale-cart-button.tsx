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
          className="absolute -right-2 -top-2 h-5 min-w-5 justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
        >
          {totalQty > 99 ? "99+" : totalQty}
        </Badge>
      )}
    </Button>
  )
}
