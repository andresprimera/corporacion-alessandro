import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type Currency } from "@base-dashboard/shared"
import { fetchClientOptionsApi } from "@/lib/clients"
import { cartItemBasicQty, createSaleApi } from "@/lib/sales"
import { useSaleCart, type CartItem } from "@/hooks/use-sale-cart"
import { useStock } from "@/hooks/use-stock"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { MinusIcon, PlusIcon, TrashIcon } from "lucide-react"

function formatPrice(value: number, currency: Currency): string {
  return `${currency} ${value.toFixed(2)}`
}

interface CartRowProps {
  item: CartItem
  available: number | undefined
  onQtyChange: (qty: number) => void
  onRemove: () => void
}

function CartRow({ item, available, onQtyChange, onRemove }: CartRowProps) {
  const { t } = useTranslation()
  const basicQty = cartItemBasicQty(item)
  const conversion = item.isPackage && item.unitsPerPackage ? item.unitsPerPackage : 1
  const displayPrice = item.unitPrice * conversion
  const subtotal = item.unitPrice * basicQty

  const isOne = item.enteredQty === 1
  const atLimit = available !== undefined && basicQty + conversion > available

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {item.productName}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatPrice(displayPrice, item.currency)} / {item.enteredUnit.name}
          </div>
        </div>
        <div className="text-base font-semibold tabular-nums whitespace-nowrap">
          {formatPrice(subtotal, item.currency)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={isOne ? onRemove : () => onQtyChange(item.enteredQty - 1)}
          aria-label={isOne ? t("Remove item") : t("Decrease quantity")}
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
          onClick={() => onQtyChange(item.enteredQty + 1)}
          disabled={atLimit}
          aria-label={t("Increase quantity")}
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
      {item.isPackage && item.unitsPerPackage ? (
        <div className="text-xs text-muted-foreground">
          {t("= {{qty}} {{unit}}", {
            qty: basicQty,
            unit: t("basic units"),
          })}
        </div>
      ) : null}
    </div>
  )
}

export function SaleFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const cart = useSaleCart()
  const stock = useStock()

  const { data: clientOptions = [] } = useQuery({
    queryKey: ["clients", "options"],
    queryFn: fetchClientOptionsApi,
    enabled: open,
  })

  const totalCurrency = cart.totalCurrency

  const selectedClient = clientOptions.find((c) => c.id === cart.clientId)
  const submitDisabled =
    cart.items.length === 0 ||
    !cart.clientId ||
    !!selectedClient?.hasPendingSale

  const mutation = useMutation({
    mutationFn: createSaleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["stock"] })
      toast.success(t("Sale created"))
      cart.resetAll()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to create sale"))
    },
  })

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (submitDisabled) return
    mutation.mutate({
      clientId: cart.clientId,
      notes: cart.notes.trim() || undefined,
      items: cart.items.map((i) => ({
        productId: i.productId,
        enteredQty: i.enteredQty,
        enteredUnitId: i.enteredUnit.id,
        unitPrice: i.unitPrice,
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Sale Confirmation")}</DialogTitle>
          <DialogDescription>
            {t("Review your order before confirming.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>{t("Client")}</FieldLabel>
              <Select
                value={cart.clientId || ""}
                onValueChange={(val) => val && cart.setClientId(val)}
                items={Object.fromEntries(
                  clientOptions.map((c) => [
                    c.id,
                    c.hasPendingSale
                      ? `${c.name} (${c.rif}) — ${t("Pending Payment(s)")}`
                      : `${c.name} (${c.rif})`,
                  ]),
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select client")} />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      disabled={c.hasPendingSale}
                    >
                      {c.name} ({c.rif})
                      {c.hasPendingSale ? ` — ${t("Pending Payment(s)")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{t("Order")}</div>
                {cart.items.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cart.clearItems}
                  >
                    {t("Clear order")}
                  </Button>
                )}
              </div>
              {cart.items.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("No products added yet")}
                </div>
              ) : (
                <div className="rounded-lg border divide-y">
                  {cart.items.map((item) => (
                    <CartRow
                      key={`${item.productId}-${item.enteredUnit.id}`}
                      item={item}
                      available={stock.getAvailable(item.productId)}
                      onQtyChange={(qty) =>
                        cart.updateQty(item.productId, item.enteredUnit.id, qty)
                      }
                      onRemove={() =>
                        cart.removeItem(item.productId, item.enteredUnit.id)
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-2">
                <span className="text-sm font-medium">
                  {t("Total qty")}: {cart.totalQty}
                </span>
                <span className="text-sm font-medium">
                  {t("Total amount")}:{" "}
                  {formatPrice(cart.totalAmount, totalCurrency)}
                </span>
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="sale-notes">{t("Notes")}</FieldLabel>
              <Input
                id="sale-notes"
                type="text"
                value={cart.notes}
                onChange={(e) => cart.setNotes(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitDisabled || mutation.isPending}
            >
              {mutation.isPending ? t("Creating...") : t("Create sale")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
