import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type Currency,
  type ProductKind,
  type ProductOption,
} from "@base-dashboard/shared"
import { fetchProductOptionsApi } from "@/lib/products"
import { fetchCityStockApi } from "@/lib/inventory"
import { fetchClientOptionsApi } from "@/lib/clients"
import { fetchCityOptionsApi } from "@/lib/cities"
import { createSaleApi } from "@/lib/sales"
import { useAuth } from "@/hooks/use-auth"
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
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
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { MinusIcon, PlusIcon, TrashIcon } from "lucide-react"

interface CartItem {
  productId: string
  productName: string
  productKind: ProductKind
  requestedQty: number
  unitPrice: number
  currency: Currency
}

interface PersistedCart {
  cityId?: string
  clientId: string
  notes: string
  items: CartItem[]
}

const STORAGE_KEY_PREFIX = "sale-cart-v1:"

function loadCart(userId: string): PersistedCart | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`)
    if (!raw) return null
    return JSON.parse(raw) as PersistedCart
  } catch {
    return null
  }
}

function saveCart(userId: string, cart: PersistedCart): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${userId}`,
      JSON.stringify(cart),
    )
  } catch {
    // storage full or disabled — ignore
  }
}

function clearCart(userId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`)
  } catch {
    // ignore
  }
}

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
  const isAdmin = user?.role === "admin"
  const userId = user?.id

  const [cityId, setCityId] = useState<string | undefined>(undefined)
  const [clientId, setClientId] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [items, setItems] = useState<CartItem[]>([])

  const [draftProduct, setDraftProduct] = useState<ProductOption | null>(null)
  const [draftQty, setDraftQty] = useState<number>(1)

  const initializedRef = useRef(false)
  useEffect(() => {
    if (open && userId && !initializedRef.current) {
      initializedRef.current = true
      const saved = loadCart(userId)
      if (saved) {
        setCityId(saved.cityId)
        setClientId(saved.clientId)
        setNotes(saved.notes)
        setItems(saved.items)
      }
    }
    if (!open) {
      initializedRef.current = false
    }
  }, [open, userId])

  useEffect(() => {
    if (!open || !userId) return
    saveCart(userId, { cityId, clientId, notes, items })
  }, [open, userId, cityId, clientId, notes, items])

  const { data: productOptions = [] } = useQuery({
    queryKey: ["products", "options"],
    queryFn: fetchProductOptionsApi,
    enabled: open,
  })

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

  const effectiveCityId = isAdmin ? cityId : user?.cityId
  const effectiveCityName = isAdmin
    ? cityOptions.find((c) => c.id === cityId)?.name
    : user?.cityName

  const draftStockQuery = useQuery({
    queryKey: [
      "stock",
      "by-city",
      { productId: draftProduct?.id, cityId: effectiveCityId },
    ],
    queryFn: () =>
      fetchCityStockApi({
        productId: draftProduct!.id,
        cityId: effectiveCityId!,
      }),
    enabled: !!draftProduct && !!effectiveCityId,
    staleTime: 30_000,
  })

  function changeCityId(next: string | undefined): void {
    if (next !== cityId && items.length > 0) {
      setItems([])
    }
    setCityId(next)
  }

  function changeClientId(next: string): void {
    if (next !== clientId && items.length > 0) {
      setItems([])
    }
    setClientId(next)
  }

  function handleAddToOrder(): void {
    if (!draftProduct || draftQty < 1) return
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === draftProduct.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === draftProduct.id
            ? { ...i, requestedQty: i.requestedQty + draftQty }
            : i,
        )
      }
      return [
        ...prev,
        {
          productId: draftProduct.id,
          productName: draftProduct.name,
          productKind: draftProduct.kind,
          requestedQty: draftQty,
          unitPrice: draftProduct.price.value,
          currency: draftProduct.price.currency,
        },
      ]
    })
    setDraftProduct(null)
    setDraftQty(1)
  }

  function handleQtyChange(productId: string, qty: number): void {
    if (qty < 1) return
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, requestedQty: qty } : i,
      ),
    )
  }

  function handleRemove(productId: string): void {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  function handleClearOrder(): void {
    setItems([])
    setNotes("")
  }

  const totalQty = items.reduce((s, i) => s + i.requestedQty, 0)
  const totalAmount = items.reduce(
    (s, i) => s + i.requestedQty * i.unitPrice,
    0,
  )
  const totalCurrency = items[0]?.currency ?? "USD"

  const salesPersonMissingCity = !isAdmin && !user?.cityId
  const submitDisabled =
    items.length === 0 ||
    !clientId ||
    !effectiveCityId ||
    salesPersonMissingCity

  const mutation = useMutation({
    mutationFn: createSaleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["stock"] })
      toast.success(t("Sale created"))
      if (userId) clearCart(userId)
      setCityId(undefined)
      setClientId("")
      setNotes("")
      setItems([])
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
      cityId: isAdmin ? cityId : undefined,
      clientId,
      notes: notes.trim() || undefined,
      items: items.map((i) => ({
        productId: i.productId,
        requestedQty: i.requestedQty,
        unitPrice: i.unitPrice,
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("New sale")}</DialogTitle>
          <DialogDescription>
            {t(
              "Pick products. Stock is checked across all warehouses in the city.",
            )}
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
                  value={cityId ?? ""}
                  onValueChange={(val) => changeCityId(val || undefined)}
                >
                  <SelectTrigger>
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
                value={clientId || ""}
                onValueChange={(val) => val && changeClientId(val)}
              >
                <SelectTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("Add product to order")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field>
                  <FieldLabel>{t("Product")}</FieldLabel>
                  <Combobox<ProductOption>
                    items={productOptions}
                    value={draftProduct}
                    onValueChange={(val) => setDraftProduct(val)}
                    itemToStringLabel={(item) => item.name}
                    itemToStringValue={(item) => item.id}
                  >
                    <ComboboxInput
                      placeholder={t("Search product")}
                      className="w-full"
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>{t("No products found")}</ComboboxEmpty>
                      <ComboboxList>
                        <ComboboxCollection>
                          {(item: ProductOption) => (
                            <ComboboxItem key={item.id} value={item}>
                              {item.name}
                              {" — "}
                              <span className="text-xs text-muted-foreground">
                                {formatPrice(item.price.value, item.price.currency)}
                              </span>
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {draftProduct && effectiveCityId && (
                    <FieldDescription
                      className={
                        draftStockQuery.data &&
                        draftQty > draftStockQuery.data.totalQty
                          ? "text-destructive"
                          : undefined
                      }
                    >
                      {t("Available in {{city}}: {{qty}}", {
                        city: effectiveCityName ?? "",
                        qty: draftStockQuery.data?.totalQty ?? 0,
                      })}
                    </FieldDescription>
                  )}
                </Field>
                <div className="flex items-end gap-2">
                  <Field className="w-28">
                    <FieldLabel htmlFor="draft-qty">{t("Qty")}</FieldLabel>
                    <Input
                      id="draft-qty"
                      type="number"
                      min={1}
                      step={1}
                      value={draftQty}
                      onChange={(e) =>
                        setDraftQty(Number(e.target.value) || 1)
                      }
                    />
                  </Field>
                  <div className="flex-1" />
                  <Button
                    type="button"
                    onClick={handleAddToOrder}
                    disabled={!draftProduct || draftQty < 1}
                  >
                    <PlusIcon className="size-4" />
                    {t("Add to order")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{t("Order")}</div>
                {items.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearOrder}
                  >
                    {t("Clear order")}
                  </Button>
                )}
              </div>
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("No products added yet")}
                </div>
              ) : (
                <div className="rounded-lg border divide-y">
                  {items.map((item) => (
                    <CartRow
                      key={item.productId}
                      item={item}
                      cityId={effectiveCityId}
                      onQtyChange={(qty) =>
                        handleQtyChange(item.productId, qty)
                      }
                      onRemove={() => handleRemove(item.productId)}
                    />
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-2">
                <span className="text-sm font-medium">
                  {t("Total qty")}: {totalQty}
                </span>
                <span className="text-sm font-medium">
                  {t("Total amount")}:{" "}
                  {formatPrice(totalAmount, totalCurrency)}
                </span>
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="sale-notes">{t("Notes")}</FieldLabel>
              <Input
                id="sale-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
