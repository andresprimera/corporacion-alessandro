import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query"
import { i18n } from "@/lib/i18n"
import { fetchExchangeRatesApi } from "@/lib/exchange-rates"
import type { ExchangeRate } from "@base-dashboard/shared"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataPagination } from "@/components/data-pagination"
import { ExchangeRateFormDialog } from "@/components/exchange-rate-form-dialog"
import { AlertCircleIcon, PlusIcon } from "lucide-react"

function formatDate(rateDate: string): string {
  const [year, month, day] = rateDate.split("-").map(Number)
  const local = new Date(year, (month ?? 1) - 1, day ?? 1)
  return local.toLocaleDateString(i18n.language)
}

function formatRate(value: number): string {
  return new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

export default function ExchangeRatesPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["exchange-rates", page, pageSize],
    queryFn: () => fetchExchangeRatesApi(page, pageSize),
    placeholderData: keepPreviousData,
  })

  const rates = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta?.totalPages ?? 1

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("Exchange Rates")}
        </h2>
        <p className="text-muted-foreground">
          {t("Record the official daily exchange rate.")}
        </p>
      </div>
      <Button onClick={() => setDialogOpen(true)}>
        <PlusIcon className="size-4" />
        {t("Add today's rate")}
      </Button>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Date")}</TableHead>
                <TableHead>{t("Rate (Bs./USD)")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ExchangeRateFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircleIcon className="size-10 text-destructive" />
          <p className="text-muted-foreground">
            {t(error.message) || t("Failed to load exchange rates")}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            {t("Try again")}
          </Button>
        </div>
        <ExchangeRateFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {header}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Date")}</TableHead>
              <TableHead>{t("Rate (Bs./USD)")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  {t("No exchange rates yet.")}
                </TableCell>
              </TableRow>
            ) : (
              rates.map((rate: ExchangeRate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">
                    {formatDate(rate.rateDate)}
                  </TableCell>
                  <TableCell>{formatRate(rate.value)}</TableCell>
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
          totalLabel={t("{{count}} rate total", { count: meta.total })}
          rowsId="rows-per-page"
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      <ExchangeRateFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
