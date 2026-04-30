import { type CommissionReportResponse } from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchCommissionReportApi(
  from: string,
  to: string,
): Promise<CommissionReportResponse> {
  const params = new URLSearchParams({ from, to })
  const res = await authFetch(`/api/commissions/report?${params}`)
  return res.json()
}
