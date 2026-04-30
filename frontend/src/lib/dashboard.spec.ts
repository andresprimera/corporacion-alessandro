import {
  fetchDashboardSummaryApi,
  fetchDashboardSalesTimeseriesApi,
} from "@/lib/dashboard"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

describe("dashboard API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchDashboardSummaryApi", () => {
    it("GETs /api/dashboard/summary and returns parsed JSON", async () => {
      const responseData = { role: "user" }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(responseData))

      const result = await fetchDashboardSummaryApi()

      expect(authFetch).toHaveBeenCalledWith("/api/dashboard/summary")
      expect(result).toEqual(responseData)
    })
  })

  describe("fetchDashboardSalesTimeseriesApi", () => {
    it("GETs /api/dashboard/sales-timeseries with range=30d", async () => {
      const responseData = { range: "30d", currency: "USD", points: [] }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(responseData))

      const result = await fetchDashboardSalesTimeseriesApi("30d")

      expect(authFetch).toHaveBeenCalledWith(
        "/api/dashboard/sales-timeseries?range=30d",
      )
      expect(result).toEqual(responseData)
    })

    it("interpolates the range param (range=7d)", async () => {
      const responseData = { range: "7d", currency: "USD", points: [] }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(responseData))

      await fetchDashboardSalesTimeseriesApi("7d")

      expect(authFetch).toHaveBeenCalledWith(
        "/api/dashboard/sales-timeseries?range=7d",
      )
    })
  })
})
