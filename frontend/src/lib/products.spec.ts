import {
  fetchProductsApi,
  createProductApi,
  updateProductApi,
  removeProductApi,
} from "@/lib/products"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

describe("products API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchProductsApi", () => {
    it("should GET /api/products with page and limit query params", async () => {
      const responseData = {
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(responseData))

      const result = await fetchProductsApi(1, 10)

      expect(authFetch).toHaveBeenCalledWith("/api/products?page=1&limit=10")
      expect(result).toEqual(responseData)
    })
  })

  describe("createProductApi", () => {
    it("should POST /api/products with grocery payload", async () => {
      const product = {
        id: "p1",
        kind: "groceries",
        name: "Rice",
        price: { value: 5, currency: "USD" },
      }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(product))

      const data = {
        kind: "groceries" as const,
        name: "Rice",
        price: { value: 5, currency: "USD" as const },
      }
      const result = await createProductApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/products", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(product)
    })

    it("should POST /api/products with liquor payload", async () => {
      const product = {
        id: "p2",
        kind: "liquor",
        name: "Bacardi",
        price: { value: 25, currency: "USD" },
        liquorType: "rum",
        presentation: "L1",
      }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(product))

      const data = {
        kind: "liquor" as const,
        name: "Bacardi",
        price: { value: 25, currency: "USD" as const },
        liquorType: "rum" as const,
        presentation: "L1" as const,
      }
      const result = await createProductApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/products", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(product)
    })
  })

  describe("updateProductApi", () => {
    it("should PATCH /api/products/:id with payload", async () => {
      const product = {
        id: "p1",
        kind: "groceries",
        name: "Rice",
        price: { value: 7, currency: "USD" },
      }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(product))

      const data = {
        kind: "groceries" as const,
        name: "Rice",
        price: { value: 7, currency: "USD" as const },
      }
      const result = await updateProductApi("p1", data)

      expect(authFetch).toHaveBeenCalledWith("/api/products/p1", {
        method: "PATCH",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(product)
    })
  })

  describe("removeProductApi", () => {
    it("should DELETE /api/products/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(undefined))

      await removeProductApi("p1")

      expect(authFetch).toHaveBeenCalledWith("/api/products/p1", {
        method: "DELETE",
      })
    })
  })
})
