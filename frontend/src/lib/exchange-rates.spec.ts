import {
  createExchangeRateApi,
  fetchExchangeRatesApi,
} from "@/lib/exchange-rates"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

describe("exchange-rates API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchExchangeRatesApi", () => {
    it("should GET /api/exchange-rates with page and limit query params", async () => {
      const responseData = {
        data: [],
        meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
      }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(responseData))

      const result = await fetchExchangeRatesApi(2, 10)

      expect(authFetch).toHaveBeenCalledWith(
        "/api/exchange-rates?page=2&limit=10",
      )
      expect(result).toEqual(responseData)
    })
  })

  describe("createExchangeRateApi", () => {
    it("should POST /api/exchange-rates with rateDate and value", async () => {
      const rate = {
        id: "rate-1",
        rateDate: "2026-05-18",
        value: 36.5,
        createdAt: "2026-05-18T00:00:00.000Z",
        updatedAt: "2026-05-18T00:00:00.000Z",
      }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(rate))

      const data = { rateDate: "2026-05-18", value: 36.5 }
      const result = await createExchangeRateApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/exchange-rates", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(rate)
    })
  })
})
