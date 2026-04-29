import {
  fetchWarehousesApi,
  fetchWarehouseOptionsApi,
  createWarehouseApi,
  updateWarehouseApi,
  removeWarehouseApi,
} from "@/lib/warehouses"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

const mockWarehouse = {
  id: "w1",
  name: "Caracas Main",
  cityId: "c1",
  cityName: "Caracas",
  isActive: true,
  createdAt: "2026-04-28T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
}

describe("warehouses API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchWarehousesApi", () => {
    it("should GET /api/warehouses with page and limit", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchWarehousesApi(1, 10)

      expect(authFetch).toHaveBeenCalledWith("/api/warehouses?page=1&limit=10")
    })

    it("should add onlyActive=true when requested", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchWarehousesApi(1, 10, { onlyActive: true })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/warehouses?page=1&limit=10&onlyActive=true",
      )
    })
  })

  describe("createWarehouseApi", () => {
    it("should POST /api/warehouses with payload", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockWarehouse))

      const data = {
        name: "Caracas Main",
        cityId: "c1",
        isActive: true,
      }
      const result = await createWarehouseApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/warehouses", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockWarehouse)
    })
  })

  describe("updateWarehouseApi", () => {
    it("should PATCH /api/warehouses/:id with payload", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockWarehouse))

      const data = { isActive: false }
      const result = await updateWarehouseApi("w1", data)

      expect(authFetch).toHaveBeenCalledWith("/api/warehouses/w1", {
        method: "PATCH",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockWarehouse)
    })
  })

  describe("removeWarehouseApi", () => {
    it("should DELETE /api/warehouses/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(undefined))

      await removeWarehouseApi("w1")

      expect(authFetch).toHaveBeenCalledWith("/api/warehouses/w1", {
        method: "DELETE",
      })
    })
  })

  describe("fetchWarehouseOptionsApi", () => {
    it("should GET /api/warehouses/options", async () => {
      const options = [
        { id: "w1", name: "Caracas Main", cityName: "Caracas" },
      ]
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(options))

      const result = await fetchWarehouseOptionsApi()

      expect(authFetch).toHaveBeenCalledWith("/api/warehouses/options")
      expect(result).toEqual(options)
    })
  })
})
