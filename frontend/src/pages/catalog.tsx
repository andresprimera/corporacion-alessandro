import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { i18n } from "@/lib/i18n"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type {
  LiquorType,
  Product,
  ProductKind,
} from "@base-dashboard/shared"
import { fetchProductsApi } from "@/lib/products"
import { useSaleCart } from "@/hooks/use-sale-cart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

function formatPresentation(value: string, t: (key: string) => string): string {
  if (value === "L1") return t("1 L")
  if (value === "ML750") return t("750 ml")
  return value
}

function liquorTypeLabel(
  value: string,
  t: (key: string) => string,
): string {
  if (value === "rum") return t("Rum")
  if (value === "whisky") return t("Whisky")
  if (value === "vodka") return t("Vodka")
  if (value === "gin") return t("Gin")
  if (value === "tequila") return t("Tequila")
  return t("Other")
}

export default function CatalogPage() {
  const { t } = useTranslation()
  const cart = useSaleCart()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [kind, setKind] = useState<ProductKind | "">("")
  const [liquorType, setLiquorType] = useState<LiquorType | "">("")
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
    liquorType: kind === "liquor" ? liquorType || undefined : undefined,
    minPrice,
    maxPrice,
    search: search || undefined,
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "products",
      "catalog",
      { page, pageSize, kind, liquorType, minPrice, maxPrice, search },
    ],
    queryFn: () => fetchProductsApi(filterArgs),
    placeholderData: keepPreviousData,
  })

  const products = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta?.totalPages ?? 1

  function handleKindChange(value: string | null): void {
    const next: ProductKind | "" =
      !value || value === KIND_ALL ? "" : (value as ProductKind)
    setKind(next)
    if (next !== "liquor") setLiquorType("")
    setPage(1)
  }

  function handleLiquorTypeChange(value: string | null): void {
    const next: LiquorType | "" =
      !value || value === LIQUOR_TYPE_ALL ? "" : (value as LiquorType)
    setLiquorType(next)
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
    setLiquorType("")
    setMinPriceStr("")
    setMaxPriceStr("")
    setPage(1)
  }

  function handleAddToCart(product: Product): void {
    cart.addItem(product, 1)
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
    <div className="flex flex-wrap items-end gap-3">
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
          className="w-56"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catalog-kind" className="text-sm font-medium">
          {t("Kind")}
        </Label>
        <Select
          value={kind === "" ? KIND_ALL : kind}
          onValueChange={handleKindChange}
        >
          <SelectTrigger id="catalog-kind" className="w-40">
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
          value={liquorType === "" ? LIQUOR_TYPE_ALL : liquorType}
          onValueChange={handleLiquorTypeChange}
          disabled={kind !== "liquor"}
        >
          <SelectTrigger id="catalog-liquor-type" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LIQUOR_TYPE_ALL}>{t("All")}</SelectItem>
            <SelectItem value="rum">{t("Rum")}</SelectItem>
            <SelectItem value="whisky">{t("Whisky")}</SelectItem>
            <SelectItem value="vodka">{t("Vodka")}</SelectItem>
            <SelectItem value="gin">{t("Gin")}</SelectItem>
            <SelectItem value="tequila">{t("Tequila")}</SelectItem>
            <SelectItem value="other">{t("Other")}</SelectItem>
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
          className="w-28"
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
          className="w-28"
        />
      </div>
      <Button variant="ghost" onClick={handleResetFilters}>
        {t("Reset filters")}
      </Button>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {heading}
        {filters}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Kind")}</TableHead>
                <TableHead>{t("Liquor type")}</TableHead>
                <TableHead>{t("Presentation")}</TableHead>
                <TableHead>{t("Price")}</TableHead>
                <TableHead className="w-32">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Kind")}</TableHead>
              <TableHead>{t("Liquor type")}</TableHead>
              <TableHead>{t("Presentation")}</TableHead>
              <TableHead>{t("Price")}</TableHead>
              <TableHead className="w-32">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <ShoppingCartIcon className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t("No products match your filters.")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                    >
                      {t("Reset filters")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {p.kind === "liquor" ? t("Liquor") : t("Groceries")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.kind === "liquor" ? (
                      liquorTypeLabel(p.liquorType, t)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.kind === "liquor" ? (
                      formatPresentation(p.presentation, t)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatPrice(p.price.value, p.price.currency)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(p)}
                    >
                      <PlusIcon className="size-4" />
                      {t("Add to cart")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
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
