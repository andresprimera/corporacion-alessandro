import {
  fetchProductsApi,
  fetchProductOptionsApi,
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
    const emptyPage = {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    }

    it("should GET /api/products with bare pagination", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(emptyPage))

      const result = await fetchProductsApi({ page: 1, limit: 10 })

      expect(authFetch).toHaveBeenCalledWith("/api/products?page=1&limit=10")
      expect(result).toEqual(emptyPage)
    })

    it("should append kind filter", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(emptyPage))

      await fetchProductsApi({ page: 1, limit: 10, kind: "liquor" })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/products?page=1&limit=10&kind=liquor",
      )
    })

    it("should append liquorType filter", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(emptyPage))

      await fetchProductsApi({ page: 1, limit: 10, liquorType: "rum" })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/products?page=1&limit=10&liquorType=rum",
      )
    })

    it("should append both minPrice and maxPrice", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(emptyPage))

      await fetchProductsApi({ page: 1, limit: 10, minPrice: 5, maxPrice: 50 })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/products?page=1&limit=10&minPrice=5&maxPrice=50",
      )
    })

    it("should append minPrice only", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(emptyPage))

      await fetchProductsApi({ page: 1, limit: 10, minPrice: 5 })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/products?page=1&limit=10&minPrice=5",
      )
    })

    it("should append maxPrice only", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(emptyPage))

      await fetchProductsApi({ page: 1, limit: 10, maxPrice: 50 })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/products?page=1&limit=10&maxPrice=50",
      )
    })

    it("should append search filter (URL-encoded)", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(emptyPage))

      await fetchProductsApi({ page: 1, limit: 10, search: "Bacardi rum" })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/products?page=1&limit=10&search=Bacardi+rum",
      )
    })

    it("should combine all filters in a single request", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(emptyPage))

      await fetchProductsApi({
        page: 2,
        limit: 25,
        kind: "liquor",
        liquorType: "whisky",
        minPrice: 10,
        maxPrice: 100,
        search: "single malt",
      })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/products?page=2&limit=25&kind=liquor&liquorType=whisky&minPrice=10&maxPrice=100&search=single+malt",
      )
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

  describe("fetchProductOptionsApi", () => {
    it("should GET /api/products/options", async () => {
      const options = [{ id: "p1", name: "Rice", kind: "groceries" }]
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(options))

      const result = await fetchProductOptionsApi()

      expect(authFetch).toHaveBeenCalledWith("/api/products/options")
      expect(result).toEqual(options)
    })
  })
})
