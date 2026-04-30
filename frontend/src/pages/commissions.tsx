import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { i18n } from "@/lib/i18n"
import { fetchCommissionReportApi } from "@/lib/commissions"
import { useAuth } from "@/hooks/use-auth"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircleIcon } from "lucide-react"

const ADMIN_COLUMN_COUNT = 5
const SALES_PERSON_COLUMN_COUNT = 4

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency,
  }).format(value)
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function endOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function dateInputToExclusiveEndIso(value: string): string {
  const start = new Date(`${value}T00:00:00.000Z`)
  start.setUTCDate(start.getUTCDate() + 1)
  return start.toISOString()
}

export default function CommissionsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isSalesPerson = user?.role === "salesPerson"
  const colSpan = isSalesPerson
    ? SALES_PERSON_COLUMN_COUNT
    : ADMIN_COLUMN_COUNT

  const initial = useMemo(() => {
    const now = new Date()
    return {
      fromDate: toDateInputValue(startOfMonth(now)),
      toDate: toDateInputValue(endOfMonth(now)),
    }
  }, [])

  const [fromDate, setFromDate] = useState(initial.fromDate)
  const [toDate, setToDate] = useState(initial.toDate)
  const [appliedRange, setAppliedRange] = useState({
    from: dateInputToIso(initial.fromDate),
    to: dateInputToExclusiveEndIso(initial.toDate),
  })

  function handleApply() {
    if (!fromDate || !toDate) return
    setAppliedRange({
      from: dateInputToIso(fromDate),
      to: dateInputToExclusiveEndIso(toDate),
    })
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["commissions", "report", appliedRange.from, appliedRange.to],
    queryFn: () =>
      fetchCommissionReportApi(appliedRange.from, appliedRange.to),
  })

  const rows = data?.rows ?? []
  const isInvalidRange = Boolean(fromDate && toDate && fromDate > toDate)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {isSalesPerson ? t("My Commissions") : t("Commissions")}
        </h2>
        <p className="text-muted-foreground">
          {isSalesPerson
            ? t("View your commissions for a date range.")
            : t("View per-sales-person commissions for a date range.")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="commissions-from"
            className="text-sm font-medium"
          >
            {t("From")}
          </label>
          <Input
            id="commissions-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="commissions-to" className="text-sm font-medium">
            {t("To")}
          </label>
          <Input
            id="commissions-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={!fromDate || !toDate || isInvalidRange}
        >
          {t("Apply")}
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {!isSalesPerson && (
                <TableHead>{t("Sales Person")}</TableHead>
              )}
              <TableHead>{t("Currency")}</TableHead>
              <TableHead className="text-right">{t("Total Sales")}</TableHead>
              <TableHead className="text-right">{t("Commission %")}</TableHead>
              <TableHead className="text-right">
                {t("Commission Amount")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {!isSalesPerson && (
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                  )}
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-4 w-12" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <AlertCircleIcon className="size-8 text-destructive" />
                    <p className="text-muted-foreground">
                      {t(error.message) ||
                        t("Failed to load commission report.")}
                    </p>
                    <Button variant="outline" onClick={() => refetch()}>
                      {t("Try again")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("No commissions in this period.")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={`${row.salesPersonId}-${row.currency}`}
                >
                  {!isSalesPerson && (
                    <TableCell className="font-medium">
                      {row.salesPersonName}
                    </TableCell>
                  )}
                  <TableCell>{row.currency}</TableCell>
                  <TableCell className="text-right">
                    {formatAmount(row.totalAmount, row.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.commissionPercentage}%
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(row.commissionAmount, row.currency)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
