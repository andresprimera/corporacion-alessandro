import { fetchCommissionReportApi } from "@/lib/commissions"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

describe("commissions API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchCommissionReportApi", () => {
    it("should GET /api/commissions/report with from and to query params", async () => {
      const responseData = {
        from: "2026-04-01T00:00:00.000Z",
        to: "2026-05-01T00:00:00.000Z",
        rows: [],
      }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(responseData))

      const result = await fetchCommissionReportApi(
        "2026-04-01T00:00:00.000Z",
        "2026-05-01T00:00:00.000Z",
      )

      const calledUrl = vi.mocked(authFetch).mock.calls[0][0] as string
      expect(calledUrl.startsWith("/api/commissions/report?")).toBe(true)
      expect(calledUrl).toContain("from=2026-04-01T00%3A00%3A00.000Z")
      expect(calledUrl).toContain("to=2026-05-01T00%3A00%3A00.000Z")
      expect(result).toEqual(responseData)
    })
  })
})
