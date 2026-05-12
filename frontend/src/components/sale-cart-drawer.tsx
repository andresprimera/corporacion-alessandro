import { useState, type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useSaleCart } from "@/hooks/use-sale-cart"
import { useStock } from "@/hooks/use-stock"
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
import { cartItemBasicQty } from "@/lib/sales"
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
  const stock = useStock()
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
                  const isOne = item.enteredQty === 1
                  const basicQty = cartItemBasicQty(item)
                  const conversion =
                    item.isPackage && item.unitsPerPackage
                      ? item.unitsPerPackage
                      : 1
                  const displayPrice = item.unitPrice * conversion
                  const subtotal = item.unitPrice * basicQty
                  const available = stock.getAvailable(item.productId)
                  const atLimit =
                    available !== undefined && basicQty + conversion > available
                  return (
                    <div
                      key={`${item.productId}-${item.enteredUnit.id}`}
                      className="space-y-2 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {item.productName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatPrice(displayPrice, item.currency)} /{" "}
                            {item.enteredUnit.name}
                          </div>
                          {available !== undefined && (
                            <div
                              className={
                                available <= 0
                                  ? "text-xs text-destructive"
                                  : "text-xs text-muted-foreground"
                              }
                            >
                              {available <= 0
                                ? t("Out of stock")
                                : t("In stock: {{qty}} {{unit}}", {
                                    qty: Math.floor(available / conversion),
                                    unit: item.enteredUnit.name,
                                  })}
                            </div>
                          )}
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
                              ? cart.removeItem(
                                  item.productId,
                                  item.enteredUnit.id,
                                )
                              : cart.updateQty(
                                  item.productId,
                                  item.enteredUnit.id,
                                  item.enteredQty - 1,
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
                          className="min-w-10 text-center text-base font-semibold tabular-nums"
                          aria-label={t("Qty")}
                        >
                          {item.enteredQty}
                        </div>
                        <div className="text-sm text-muted-foreground min-w-12">
                          {item.enteredUnit.name}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            cart.updateQty(
                              item.productId,
                              item.enteredUnit.id,
                              item.enteredQty + 1,
                            )
                          }
                          disabled={atLimit}
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
