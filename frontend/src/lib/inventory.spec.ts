import {
  fetchInventoryTransactionsApi,
  createInventoryTransactionApi,
  updateInventoryTransactionApi,
  removeInventoryTransactionApi,
  fetchStockAggregatedApi,
  fetchStockByWarehouseApi,
} from "@/lib/inventory"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

const mockTransaction = {
  id: "tx-1",
  productId: "p1",
  warehouseId: "w1",
  transactionType: "inbound",
  batch: "BATCH-001",
  qty: 100,
  createdBy: { userId: "user-1", name: "Alice" },
  createdAt: "2026-04-28T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
}

describe("inventory API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchInventoryTransactionsApi", () => {
    it("should GET /api/inventory-transactions with pagination", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchInventoryTransactionsApi(1, 10)

      expect(authFetch).toHaveBeenCalledWith(
        "/api/inventory-transactions?page=1&limit=10",
      )
    })
  })

  describe("createInventoryTransactionApi", () => {
    it("should POST /api/inventory-transactions with payload", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockTransaction))

      const data = {
        productId: "p1",
        warehouseId: "w1",
        transactionType: "inbound" as const,
        batch: "BATCH-001",
        qty: 100,
      }
      const result = await createInventoryTransactionApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/inventory-transactions", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockTransaction)
    })
  })

  describe("updateInventoryTransactionApi", () => {
    it("should PATCH /api/inventory-transactions/:id with payload", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockTransaction))

      const data = { qty: 120 }
      const result = await updateInventoryTransactionApi("tx-1", data)

      expect(authFetch).toHaveBeenCalledWith(
        "/api/inventory-transactions/tx-1",
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      )
      expect(result).toEqual(mockTransaction)
    })
  })

  describe("removeInventoryTransactionApi", () => {
    it("should DELETE /api/inventory-transactions/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(undefined))

      await removeInventoryTransactionApi("tx-1")

      expect(authFetch).toHaveBeenCalledWith(
        "/api/inventory-transactions/tx-1",
        { method: "DELETE" },
      )
    })
  })

  describe("fetchStockAggregatedApi", () => {
    it("should GET /api/inventory-transactions/stock/aggregated", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchStockAggregatedApi(1, 10)

      expect(authFetch).toHaveBeenCalledWith(
        "/api/inventory-transactions/stock/aggregated?page=1&limit=10",
      )
    })
  })

  describe("fetchStockByWarehouseApi", () => {
    it("should GET /api/inventory-transactions/stock/by-warehouse", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchStockByWarehouseApi({ page: 1, limit: 10 })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/inventory-transactions/stock/by-warehouse?page=1&limit=10",
      )
    })

    it("should include warehouseId when provided", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchStockByWarehouseApi({
        warehouseId: "w1",
        page: 1,
        limit: 10,
      })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/inventory-transactions/stock/by-warehouse?page=1&limit=10&warehouseId=w1",
      )
    })
  })
})
