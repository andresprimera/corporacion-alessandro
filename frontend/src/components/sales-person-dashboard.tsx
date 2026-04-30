import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { i18n } from "@/lib/i18n"
import { fetchDashboardSummaryApi } from "@/lib/dashboard"
import { DashboardCard } from "@/components/dashboard-card"
import { DashboardSalesChart } from "@/components/dashboard-sales-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertCircleIcon,
  ContactIcon,
  PercentIcon,
  ReceiptIcon,
} from "lucide-react"
import type { Currency } from "@base-dashboard/shared"

function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency,
  }).format(amount)
}

function deltaBadge(
  current: number,
  previous: number,
): { badge: string; trend: "up" | "down" } {
  if (previous === 0) {
    return { badge: current > 0 ? "+100%" : "—", trend: "up" }
  }
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? "+" : ""
  return {
    badge: `${sign}${pct.toFixed(1)}%`,
    trend: pct < 0 ? "down" : "up",
  }
}

export function SalesPersonDashboard() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummaryApi,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
        <div className="px-4 lg:px-6">
          <Skeleton className="h-[350px] w-full" />
        </div>
        <div className="px-4 lg:px-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertCircleIcon className="size-10 text-destructive" />
        <p className="text-muted-foreground">{t("Failed to load dashboard")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("Retry")}
        </Button>
      </div>
    )
  }

  if (data?.role !== "salesPerson") {
    return null
  }

  const saleCountDelta = deltaBadge(
    data.saleCountCurrent,
    data.saleCountPrevious,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        {data.revenueCurrent.length === 0 ? (
          <DashboardCard
            label={t("Total Revenue")}
            value="—"
            badge="—"
            trend="up"
            footerText={t("Current month")}
            footerDescription={t("No sales yet.")}
          />
        ) : (
          data.revenueCurrent.map((row) => {
            const previous =
              data.revenuePrevious.find((p) => p.currency === row.currency)
                ?.total ?? 0
            const delta = deltaBadge(row.total, previous)
            return (
              <DashboardCard
                key={row.currency}
                label={t("Total Revenue ({{currency}})", {
                  currency: row.currency,
                })}
                value={formatCurrency(row.total, row.currency)}
                badge={delta.badge}
                trend={delta.trend}
                footerText={t("Current month")}
                footerDescription={t("vs previous month")}
              />
            )
          })
        )}
        <DashboardCard
          label={t("Sale Count")}
          value={String(data.saleCountCurrent)}
          badge={saleCountDelta.badge}
          trend={saleCountDelta.trend}
          footerText={t("Current month")}
          footerDescription={t("vs previous month")}
          footerIcon={ReceiptIcon}
        />
        <DashboardCard
          label={t("My Clients")}
          value={String(data.myClientsCount)}
          badge="—"
          trend="up"
          footerText={t("Total clients")}
          footerDescription={t("Assigned to me")}
          footerIcon={ContactIcon}
        />
        {data.projectedCommission.length === 0 ? (
          <DashboardCard
            label={t("Projected Commission")}
            value="—"
            badge="—"
            trend="up"
            footerText={t("Current month")}
            footerDescription={t("No sales yet.")}
            footerIcon={PercentIcon}
          />
        ) : (
          data.projectedCommission.map((row) => (
            <DashboardCard
              key={row.currency}
              label={t("Projected Commission ({{currency}})", {
                currency: row.currency,
              })}
              value={formatCurrency(row.commissionAmount, row.currency)}
              badge={`${row.commissionPercentage}%`}
              trend="up"
              footerText={t("Current month")}
              footerDescription={t("Based on current commission rate")}
              footerIcon={PercentIcon}
            />
          ))
        )}
      </div>
      <div className="px-4 lg:px-6">
        <DashboardSalesChart />
      </div>
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("My Recent Sales")}</CardTitle>
            <CardDescription>
              {t("Your last 10 sales")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <ReceiptIcon className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("No sales yet.")}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Sale #")}</TableHead>
                      <TableHead>{t("Date")}</TableHead>
                      <TableHead>{t("Client")}</TableHead>
                      <TableHead className="text-right">
                        {t("Amount")}
                      </TableHead>
                      <TableHead>{t("Currency")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {sale.saleNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(sale.createdAt).toLocaleDateString(
                            i18n.language,
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </TableCell>
                        <TableCell>{sale.clientName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(sale.totalAmount, sale.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sale.currency}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
