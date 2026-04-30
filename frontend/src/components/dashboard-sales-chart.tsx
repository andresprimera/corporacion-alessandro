import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { i18n } from "@/lib/i18n"
import { fetchDashboardSalesTimeseriesApi } from "@/lib/dashboard"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { AlertCircleIcon, BarChart3Icon } from "lucide-react"
import type { DashboardRange } from "@base-dashboard/shared"

const chartConfig = {
  total: {
    label: "Sales",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function DashboardSalesChart() {
  const { t } = useTranslation()
  const [range, setRange] = React.useState<DashboardRange>("30d")
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-timeseries", range],
    queryFn: () => fetchDashboardSalesTimeseriesApi(range),
    placeholderData: keepPreviousData,
  })

  const points = data?.points ?? []
  const isEmpty =
    !isLoading && !isError && points.length > 0 && points.every((p) => p.total === 0)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{t("Sales Over Time")}</CardTitle>
        <CardDescription>
          {t("Showing daily sales (USD only)")}
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={[range]}
            onValueChange={(value) => {
              const next = value[0]
              if (next === "7d" || next === "30d" || next === "90d") {
                setRange(next)
              }
            }}
            variant="outline"
          >
            <ToggleGroupItem value="90d">{t("Last 3 months")}</ToggleGroupItem>
            <ToggleGroupItem value="30d">{t("Last 30 days")}</ToggleGroupItem>
            <ToggleGroupItem value="7d">{t("Last 7 days")}</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <Skeleton className="h-62.5 w-full" />
        ) : isError ? (
          <div className="flex h-62.5 flex-col items-center justify-center gap-3">
            <AlertCircleIcon className="size-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {t("Failed to load chart")}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("Retry")}
            </Button>
          </div>
        ) : isEmpty ? (
          <div className="flex h-62.5 flex-col items-center justify-center gap-3">
            <BarChart3Icon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("No sales in this range.")}
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <AreaChart data={points}>
              <defs>
                <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-total)"
                    stopOpacity={1}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-total)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value: string) => {
                  const date = new Date(`${value}T00:00:00Z`)
                  return date.toLocaleDateString(i18n.language, {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      if (typeof value !== "string") return ""
                      return new Date(`${value}T00:00:00Z`).toLocaleDateString(
                        i18n.language,
                        { month: "short", day: "numeric" },
                      )
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="total"
                type="natural"
                fill="url(#fillTotal)"
                stroke="var(--color-total)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
