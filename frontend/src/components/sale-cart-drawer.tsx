import { useState, type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useSaleCart } from "@/hooks/use-sale-cart"
import { useAuth } from "@/hooks/use-auth"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SaleFormDialog } from "@/components/sale-form-dialog"
import { i18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import {
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  TrashIcon,
} from "lucide-react"

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency,
  }).format(value)
}

export function SaleCartDrawer(): ReactElement | null {
  const { t } = useTranslation()
  const { user } = useAuth()
  const cart = useSaleCart()
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const role = user?.role
  if (role !== "admin" && role !== "salesPerson") return null

  return (
    <>
      <Sheet
        open={cart.isDrawerOpen}
        onOpenChange={(open) =>
          open ? cart.openDrawer() : cart.closeDrawer()
        }
      >
        <SheetContent
          side="right"
          className="flex flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>{t("Order cart")}</SheetTitle>
            <SheetDescription>
              {t("{{count}} item", { count: cart.items.length })} ·{" "}
              {formatPrice(cart.totalAmount, cart.totalCurrency)}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {cart.items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <ShoppingCartIcon className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("Your cart is empty")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Add products from the catalog to get started.")}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.items.map((item) => {
                  const isOne = item.requestedQty === 1
                  const subtotal = item.unitPrice * item.requestedQty
                  return (
                    <div key={item.productId} className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {item.productName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatPrice(item.unitPrice, item.currency)}
                          </div>
                        </div>
                        <div className="text-base font-semibold tabular-nums">
                          {formatPrice(subtotal, item.currency)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            isOne
                              ? cart.removeItem(item.productId)
                              : cart.updateQty(
                                  item.productId,
                                  item.requestedQty - 1,
                                )
                          }
                          aria-label={
                            isOne
                              ? t("Remove item")
                              : t("Decrease quantity")
                          }
                        >
                          {isOne ? (
                            <TrashIcon className="size-4" />
                          ) : (
                            <MinusIcon className="size-4" />
                          )}
                        </Button>
                        <div
                          className={cn(
                            "min-w-10 text-center text-base font-semibold tabular-nums",
                          )}
                          aria-label={t("Qty")}
                        >
                          {item.requestedQty}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            cart.updateQty(
                              item.productId,
                              item.requestedQty + 1,
                            )
                          }
                          aria-label={t("Increase quantity")}
                        >
                          <PlusIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <SheetFooter className="border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("Total")}</span>
              <span className="text-base font-semibold tabular-nums">
                {formatPrice(cart.totalAmount, cart.totalCurrency)}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={cart.clearItems}
              disabled={cart.items.length === 0}
            >
              {t("Clear order")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                cart.closeDrawer()
                setCheckoutOpen(true)
              }}
              disabled={cart.items.length === 0}
            >
              {t("Checkout")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <SaleFormDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  )
}
