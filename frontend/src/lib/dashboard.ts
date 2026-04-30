import {
  type DashboardRange,
  type DashboardSalesTimeseriesResponse,
  type DashboardSummaryResponse,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchDashboardSummaryApi(): Promise<DashboardSummaryResponse> {
  const res = await authFetch("/api/dashboard/summary")
  return res.json()
}

export async function fetchDashboardSalesTimeseriesApi(
  range: DashboardRange,
): Promise<DashboardSalesTimeseriesResponse> {
  const params = new URLSearchParams({ range })
  const res = await authFetch(`/api/dashboard/sales-timeseries?${params}`)
  return res.json()
}
