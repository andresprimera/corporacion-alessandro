import {
  fetchCitiesApi,
  fetchCityOptionsApi,
  createCityApi,
  updateCityApi,
  removeCityApi,
} from "@/lib/cities"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

const mockCity = {
  id: "c1",
  name: "Caracas",
  isActive: true,
  createdAt: "2026-04-28T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
}

describe("cities API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchCitiesApi", () => {
    it("should GET /api/cities with pagination", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchCitiesApi(1, 10)

      expect(authFetch).toHaveBeenCalledWith("/api/cities?page=1&limit=10")
    })

    it("should include onlyActive=true when requested", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchCitiesApi(1, 10, { onlyActive: true })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/cities?page=1&limit=10&onlyActive=true",
      )
    })
  })

  describe("createCityApi", () => {
    it("should POST /api/cities", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockCity))

      const data = { name: "Caracas", isActive: true }
      const result = await createCityApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/cities", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockCity)
    })
  })

  describe("updateCityApi", () => {
    it("should PATCH /api/cities/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockCity))

      const data = { isActive: false }
      const result = await updateCityApi("c1", data)

      expect(authFetch).toHaveBeenCalledWith("/api/cities/c1", {
        method: "PATCH",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockCity)
    })
  })

  describe("removeCityApi", () => {
    it("should DELETE /api/cities/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(undefined))

      await removeCityApi("c1")

      expect(authFetch).toHaveBeenCalledWith("/api/cities/c1", {
        method: "DELETE",
      })
    })
  })

  describe("fetchCityOptionsApi", () => {
    it("should GET /api/cities/options", async () => {
      const options = [{ id: "c1", name: "Caracas" }]
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(options))

      const result = await fetchCityOptionsApi()

      expect(authFetch).toHaveBeenCalledWith("/api/cities/options")
      expect(result).toEqual(options)
    })
  })
})
