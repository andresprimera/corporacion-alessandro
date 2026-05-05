import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type Currency } from "@base-dashboard/shared"
import { fetchCityStockApi } from "@/lib/inventory"
import { fetchClientOptionsApi } from "@/lib/clients"
import { fetchCityOptionsApi } from "@/lib/cities"
import { createSaleApi } from "@/lib/sales"
import { useAuth } from "@/hooks/use-auth"
import { useSaleCart, type CartItem } from "@/hooks/use-sale-cart"
import { cn } from "@/lib/utils"
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
  cityId: string | undefined
  onQtyChange: (qty: number) => void
  onRemove: () => void
}

function CartRow({
  item,
  cityId,
  onQtyChange,
  onRemove,
}: CartRowProps) {
  const { t } = useTranslation()
  const { data: stock } = useQuery({
    queryKey: ["stock", "by-city", { productId: item.productId, cityId }],
    queryFn: () =>
      fetchCityStockApi({ productId: item.productId, cityId: cityId ?? "" }),
    enabled: !!cityId,
    staleTime: 30_000,
  })
  const insufficient =
    stock != null && cityId != null && item.requestedQty > stock.totalQty
  const subtotal = item.unitPrice * item.requestedQty

  const isOne = item.requestedQty === 1

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {item.productName}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatPrice(item.unitPrice, item.currency)}
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
          onClick={isOne ? onRemove : () => onQtyChange(item.requestedQty - 1)}
          aria-label={isOne ? t("Remove item") : t("Decrease quantity")}
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
            insufficient && "text-destructive",
          )}
          aria-label={t("Qty")}
        >
          {item.requestedQty}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onQtyChange(item.requestedQty + 1)}
          aria-label={t("Increase quantity")}
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
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
  const { user } = useAuth()
  const cart = useSaleCart()
  const isAdmin = user?.role === "admin"

  const { data: clientOptions = [] } = useQuery({
    queryKey: ["clients", "options"],
    queryFn: fetchClientOptionsApi,
    enabled: open,
  })

  const { data: cityOptions = [] } = useQuery({
    queryKey: ["cities", "options"],
    queryFn: fetchCityOptionsApi,
    enabled: open && isAdmin,
  })

  const effectiveCityId = isAdmin ? cart.cityId : user?.cityId

  const totalCurrency = cart.totalCurrency

  const salesPersonMissingCity = !isAdmin && !user?.cityId
  const submitDisabled =
    cart.items.length === 0 ||
    !cart.clientId ||
    !effectiveCityId ||
    salesPersonMissingCity

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
      cityId: isAdmin ? cart.cityId : undefined,
      clientId: cart.clientId,
      notes: cart.notes.trim() || undefined,
      items: cart.items.map((i) => ({
        productId: i.productId,
        requestedQty: i.requestedQty,
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
        {salesPersonMissingCity && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {t("Your account has no assigned city. Contact an admin.")}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {isAdmin && (
              <Field>
                <FieldLabel>{t("City")}</FieldLabel>
                <Select
                  value={cart.cityId ?? ""}
                  onValueChange={(val) => cart.setCityId(val || undefined)}
                  items={Object.fromEntries(
                    cityOptions.map((c) => [c.id, c.name]),
                  )}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("Select city")} />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel>{t("Client")}</FieldLabel>
              <Select
                value={cart.clientId || ""}
                onValueChange={(val) => val && cart.setClientId(val)}
                items={Object.fromEntries(
                  clientOptions.map((c) => [c.id, `${c.name} (${c.rif})`]),
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select client")} />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.rif})
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
                      key={item.productId}
                      item={item}
                      cityId={effectiveCityId}
                      onQtyChange={(qty) =>
                        cart.updateQty(item.productId, qty)
                      }
                      onRemove={() => cart.removeItem(item.productId)}
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
