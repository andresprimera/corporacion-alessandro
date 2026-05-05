import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
  fetchStockAggregatedApi,
  fetchStockByWarehouseApi,
} from "@/lib/inventory"
import { fetchWarehouseOptionsApi } from "@/lib/warehouses"
import type { ProductKind } from "@base-dashboard/shared"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { DataPagination } from "@/components/data-pagination"
import { AlertCircleIcon } from "lucide-react"

const ALL_WAREHOUSES = "__all__"

function kindLabel(value: ProductKind, t: (key: string) => string): string {
  if (value === "liquor") return t("Liquor")
  return t("Groceries")
}

function AggregatedTab() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["inventory", "stock", "aggregated", page, pageSize],
    queryFn: () => fetchStockAggregatedApi(page, pageSize),
    placeholderData: keepPreviousData,
  })

  const rows = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta?.totalPages ?? 1

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Product")}</TableHead>
              <TableHead>{t("Kind")}</TableHead>
              <TableHead>{t("Quantity")}</TableHead>
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
                  <Skeleton className="h-4 w-12" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertCircleIcon className="size-10 text-destructive" />
        <p className="text-muted-foreground">
          {t(error.message) || t("Failed to load stock.")}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("Try again")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Product")}</TableHead>
              <TableHead>{t("Kind")}</TableHead>
              <TableHead>{t("Quantity")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  {t("No stock data.")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell className="font-medium">
                    {row.productName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {kindLabel(row.productKind, t)}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.totalQty}</TableCell>
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
          rowsId="rows-per-page-stock-aggregated"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}
    </div>
  )
}

function ByWarehouseTab() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [warehouseFilter, setWarehouseFilter] = useState<string>(ALL_WAREHOUSES)

  const warehousesQuery = useQuery({
    queryKey: ["warehouses", "options"],
    queryFn: fetchWarehouseOptionsApi,
  })

  const warehouses = warehousesQuery.data ?? []

  const activeWarehouseId =
    warehouseFilter === ALL_WAREHOUSES ? undefined : warehouseFilter

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "inventory",
      "stock",
      "by-warehouse",
      warehouseFilter,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchStockByWarehouseApi({
        warehouseId: activeWarehouseId,
        page,
        limit: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const rows = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta?.totalPages ?? 1

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{t("Warehouse")}</Label>
        <Select
          value={warehouseFilter}
          onValueChange={(v) => {
            if (!v) return
            setWarehouseFilter(v)
            setPage(1)
          }}
          items={{
            [ALL_WAREHOUSES]: t("All warehouses"),
            ...Object.fromEntries(
              warehouses.map((w) => [
                w.id,
                w.cityName ? `${w.name} — ${w.cityName}` : w.name,
              ]),
            ),
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_WAREHOUSES}>
              {t("All warehouses")}
            </SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.cityName ? `${w.name} — ${w.cityName}` : w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Product")}</TableHead>
                <TableHead>{t("Kind")}</TableHead>
                <TableHead>{t("Warehouse")}</TableHead>
                <TableHead>{t("Quantity")}</TableHead>
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
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircleIcon className="size-10 text-destructive" />
          <p className="text-muted-foreground">
            {t(error.message) || t("Failed to load stock.")}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            {t("Try again")}
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Product")}</TableHead>
                  <TableHead>{t("Kind")}</TableHead>
                  <TableHead>{t("Warehouse")}</TableHead>
                  <TableHead>{t("Quantity")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {t("No stock data.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={`${row.productId}-${row.warehouseId}`}>
                      <TableCell className="font-medium">
                        {row.productName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {kindLabel(row.productKind, t)}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.warehouseName}</TableCell>
                      <TableCell>{row.totalQty}</TableCell>
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
              totalLabel={t("{{count}} row total", { count: meta.total })}
              rowsId="rows-per-page-stock-by-warehouse"
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

export default function StockPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("Stock")}</h2>
        <p className="text-muted-foreground">
          {t("Current stock per product.")}
        </p>
      </div>
      <Tabs defaultValue="aggregated">
        <TabsList>
          <TabsTrigger value="aggregated">{t("Aggregated")}</TabsTrigger>
          <TabsTrigger value="by-warehouse">{t("By warehouse")}</TabsTrigger>
        </TabsList>
        <TabsContent value="aggregated" className="pt-4">
          <AggregatedTab />
        </TabsContent>
        <TabsContent value="by-warehouse" className="pt-4">
          <ByWarehouseTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
