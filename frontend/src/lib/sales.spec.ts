import {
  fetchSalesApi,
  fetchSaleApi,
  createSaleApi,
  updateSaleApi,
  removeSaleApi,
} from "@/lib/sales"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

describe("sales API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchSalesApi", () => {
    it("should GET /api/sales with pagination params", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchSalesApi(2, 10)

      expect(authFetch).toHaveBeenCalledWith("/api/sales?page=2&limit=10")
    })
  })

  describe("fetchSaleApi", () => {
    it("should GET /api/sales/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse({ id: "s1" }))

      const result = await fetchSaleApi("s1")

      expect(authFetch).toHaveBeenCalledWith("/api/sales/s1")
      expect(result).toEqual({ id: "s1" })
    })
  })

  describe("createSaleApi", () => {
    it("should POST /api/sales with the sale payload", async () => {
      const sale = { id: "s1" }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(sale))

      const data = {
        clientId: "c1",
        items: [
          {
            productId: "p1",
            requestedQty: 10,
            unitPrice: 1.5,
            allocations: [{ warehouseId: "w1", qty: 10 }],
          },
        ],
      }
      const result = await createSaleApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/sales", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(sale)
    })
  })

  describe("updateSaleApi", () => {
    it("should PATCH /api/sales/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse({ id: "s1" }))

      const data = { notes: "Updated" }
      await updateSaleApi("s1", data)

      expect(authFetch).toHaveBeenCalledWith("/api/sales/s1", {
        method: "PATCH",
        body: JSON.stringify(data),
      })
    })
  })

  describe("removeSaleApi", () => {
    it("should DELETE /api/sales/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(undefined))

      await removeSaleApi("s1")

      expect(authFetch).toHaveBeenCalledWith("/api/sales/s1", {
        method: "DELETE",
      })
    })
  })

})
