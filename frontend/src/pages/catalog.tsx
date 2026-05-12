import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { i18n } from "@/lib/i18n"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { Product, ProductKind } from "@base-dashboard/shared"
import { fetchProductsApi } from "@/lib/products"
import { fetchLiquorTypeOptionsApi } from "@/lib/liquor-types"
import { useSaleCart } from "@/hooks/use-sale-cart"
import { useStock } from "@/hooks/use-stock"
import { buildUnitChoices, type UnitChoice } from "@/lib/inventory"
import { cartItemBasicQty } from "@/lib/sales"
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataPagination } from "@/components/data-pagination"
import {
  AlertCircleIcon,
  PlusIcon,
  ShoppingCartIcon,
} from "lucide-react"

const KIND_ALL = "__all__"
const LIQUOR_TYPE_ALL = "__all__"

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency,
  }).format(value)
}

interface CatalogCardProps {
  product: Product
  available: number | undefined
  inCartBasicQty: number
  onAdd: (product: Product, qty: number, unit: UnitChoice) => void
}

function CatalogCard({
  product,
  available,
  inCartBasicQty,
  onAdd,
}: CatalogCardProps) {
  const { t } = useTranslation()
  const unitChoices = useMemo(() => buildUnitChoices(product), [product])
  const defaultUnit = unitChoices[0]
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    defaultUnit?.id ?? "",
  )
  const [qtyStr, setQtyStr] = useState<string>("1")

  const selectedUnit =
    unitChoices.find((u) => u.id === selectedUnitId) ?? defaultUnit
  const parsedQty = Number.parseInt(qtyStr, 10)
  const qty = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 0
  const conversion =
    selectedUnit?.isPackage && product.unitsPerPackage
      ? product.unitsPerPackage
      : 1
  const addBasicQty = qty * conversion
  const outOfStock = available !== undefined && available <= 0
  const cantAdd =
    !selectedUnit ||
    qty <= 0 ||
    (available !== undefined && inCartBasicQty + addBasicQty > available)

  function handleAdd(): void {
    if (!selectedUnit || qty <= 0) return
    onAdd(product, qty, selectedUnit)
    setQtyStr("1")
  }

  const metaParts: string[] = [
    product.kind === "liquor" ? t("Liquor") : t("Groceries"),
  ]
  if (product.kind === "liquor") {
    if (product.liquorType?.name) metaParts.push(product.liquorType.name)
    if (product.presentation?.name) metaParts.push(product.presentation.name)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-snug wrap-break-word">
              {product.name}
            </CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              {metaParts.join(" · ")}
            </div>
            {available !== undefined && (
              <div
                className={
                  outOfStock
                    ? "mt-1 text-xs text-destructive"
                    : "mt-1 text-xs text-muted-foreground"
                }
              >
                {outOfStock
                  ? t("Out of stock")
                  : t("In stock: {{qty}} {{unit}}", {
                      qty: Math.floor(available / conversion),
                      unit: selectedUnit?.name ?? "",
                    })}
              </div>
            )}
          </div>
          <div className="shrink-0 text-right text-lg font-semibold tabular-nums">
            {formatPrice(product.price.value, product.price.currency)}
          </div>
        </div>
      </CardHeader>
      <CardFooter className="flex-col items-stretch gap-2 border-t-0 bg-transparent">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            step={1}
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            className="w-20"
            aria-label={t("Qty")}
          />
          {unitChoices.length > 1 ? (
            <Select
              value={selectedUnitId}
              onValueChange={(v) => v && setSelectedUnitId(v)}
              items={Object.fromEntries(
                unitChoices.map((u) => [u.id, u.name]),
              )}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitChoices.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : selectedUnit ? (
            <div className="flex-1 text-sm text-muted-foreground">
              {selectedUnit.name}
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={handleAdd}
          disabled={cantAdd}
          className="w-full"
        >
          <PlusIcon className="size-4" />
          {t("Add to cart")}
        </Button>
      </CardFooter>
    </Card>
  )
}

function CatalogCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0" />
        </div>
      </CardHeader>
      <CardFooter className="flex-col items-stretch gap-2 border-t-0 bg-transparent">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  )
}

export default function CatalogPage() {
  const { t } = useTranslation()
  const cart = useSaleCart()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [kind, setKind] = useState<ProductKind | "">("")
  const [liquorTypeId, setLiquorTypeId] = useState<string>("")
  const [minPriceStr, setMinPriceStr] = useState("")
  const [maxPriceStr, setMaxPriceStr] = useState("")

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  const minPrice = minPriceStr === "" ? undefined : Number(minPriceStr)
  const maxPrice = maxPriceStr === "" ? undefined : Number(maxPriceStr)

  const filterArgs = {
    page,
    limit: pageSize,
    kind: kind || undefined,
    liquorTypeId: kind === "liquor" ? liquorTypeId || undefined : undefined,
    minPrice,
    maxPrice,
    search: search || undefined,
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "products",
      "catalog",
      { page, pageSize, kind, liquorTypeId, minPrice, maxPrice, search },
    ],
    queryFn: () => fetchProductsApi(filterArgs),
    placeholderData: keepPreviousData,
  })

  const liquorTypesQuery = useQuery({
    queryKey: ["liquor-types", "options"],
    queryFn: fetchLiquorTypeOptionsApi,
  })
  const liquorTypes = liquorTypesQuery.data ?? []

  const stock = useStock()

  function cartBasicQtyFor(productId: string): number {
    return cart.items
      .filter((i) => i.productId === productId)
      .reduce((sum, i) => sum + cartItemBasicQty(i), 0)
  }

  const products = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta?.totalPages ?? 1

  function handleKindChange(value: string | null): void {
    const next: ProductKind | "" =
      !value || value === KIND_ALL ? "" : (value as ProductKind)
    setKind(next)
    if (next !== "liquor") setLiquorTypeId("")
    setPage(1)
  }

  function handleLiquorTypeChange(value: string | null): void {
    const next = !value || value === LIQUOR_TYPE_ALL ? "" : value
    setLiquorTypeId(next)
    setPage(1)
  }

  function handleMinPriceChange(value: string): void {
    setMinPriceStr(value)
    setPage(1)
  }

  function handleMaxPriceChange(value: string): void {
    setMaxPriceStr(value)
    setPage(1)
  }

  function handlePageSizeChange(size: number): void {
    setPageSize(size)
    setPage(1)
  }

  function handleResetFilters(): void {
    setSearchInput("")
    setSearch("")
    setKind("")
    setLiquorTypeId("")
    setMinPriceStr("")
    setMaxPriceStr("")
    setPage(1)
  }

  function handleAddToCart(
    product: Product,
    qty: number,
    unit: UnitChoice,
  ): void {
    cart.addItem(product, {
      qty,
      unit: { id: unit.id, name: unit.name, abbreviation: unit.abbreviation },
      isPackage: unit.isPackage,
      unitsPerPackage: product.unitsPerPackage,
      basicUnit: product.basicUnit,
      packageUnit: product.packageUnit,
    })
  }

  const heading = (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{t("Catalog")}</h2>
      <p className="text-muted-foreground">
        {t("Browse products and add them to your order.")}
      </p>
    </div>
  )

  const filters = (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catalog-search" className="text-sm font-medium">
          {t("Search")}
        </Label>
        <Input
          id="catalog-search"
          type="text"
          placeholder={t("Search products")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full md:w-56"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catalog-kind" className="text-sm font-medium">
          {t("Kind")}
        </Label>
        <Select
          value={kind === "" ? KIND_ALL : kind}
          onValueChange={handleKindChange}
          items={{
            [KIND_ALL]: t("All"),
            groceries: t("Groceries"),
            liquor: t("Liquor"),
          }}
        >
          <SelectTrigger id="catalog-kind" className="w-full md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={KIND_ALL}>{t("All")}</SelectItem>
            <SelectItem value="groceries">{t("Groceries")}</SelectItem>
            <SelectItem value="liquor">{t("Liquor")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catalog-liquor-type" className="text-sm font-medium">
          {t("Liquor type")}
        </Label>
        <Select
          value={liquorTypeId === "" ? LIQUOR_TYPE_ALL : liquorTypeId}
          onValueChange={handleLiquorTypeChange}
          disabled={kind !== "liquor"}
          items={{
            [LIQUOR_TYPE_ALL]: t("All"),
            ...Object.fromEntries(liquorTypes.map((l) => [l.id, l.name])),
          }}
        >
          <SelectTrigger id="catalog-liquor-type" className="w-full md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LIQUOR_TYPE_ALL}>{t("All")}</SelectItem>
            {liquorTypes.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catalog-min-price" className="text-sm font-medium">
          {t("Min price")}
        </Label>
        <Input
          id="catalog-min-price"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={minPriceStr}
          onChange={(e) => handleMinPriceChange(e.target.value)}
          className="w-full md:w-28"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catalog-max-price" className="text-sm font-medium">
          {t("Max price")}
        </Label>
        <Input
          id="catalog-max-price"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={maxPriceStr}
          onChange={(e) => handleMaxPriceChange(e.target.value)}
          className="w-full md:w-28"
        />
      </div>
      <Button
        variant="ghost"
        onClick={handleResetFilters}
        className="w-full md:w-auto"
      >
        {t("Reset filters")}
      </Button>
    </div>
  )

  const gridClass =
    "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

  if (isLoading) {
    return (
      <div className="space-y-4">
        {heading}
        {filters}
        <div className={gridClass}>
          {Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
            <CatalogCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {heading}
        {filters}
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircleIcon className="size-10 text-destructive" />
          <p className="text-muted-foreground">
            {t(error.message) || t("Failed to load products.")}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            {t("Try again")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {heading}
      {filters}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
          <ShoppingCartIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t("No products match your filters.")}
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            {t("Reset filters")}
          </Button>
        </div>
      ) : (
        <div className={gridClass}>
          {products.map((p) => (
            <CatalogCard
              key={p.id}
              product={p}
              available={stock.getAvailable(p.id)}
              inCartBasicQty={cartBasicQtyFor(p.id)}
              onAdd={handleAddToCart}
            />
          ))}
        </div>
      )}
      {meta && (
        <DataPagination
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalLabel={t("{{count}} product total", { count: meta.total })}
          rowsId="rows-per-page-catalog"
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  )
}
