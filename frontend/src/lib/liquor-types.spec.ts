import {
  fetchLiquorTypesApi,
  fetchLiquorTypeOptionsApi,
  createLiquorTypeApi,
  updateLiquorTypeApi,
  removeLiquorTypeApi,
} from "@/lib/liquor-types"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

const mockLiquorType = {
  id: "lt1",
  name: "Ron",
  abbreviation: "ron",
  createdAt: "2026-04-28T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
}

describe("liquor-types API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchLiquorTypesApi", () => {
    it("should GET /api/liquor-types with pagination", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchLiquorTypesApi(1, 10)

      expect(authFetch).toHaveBeenCalledWith(
        "/api/liquor-types?page=1&limit=10",
      )
    })

    it("should include search when requested", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchLiquorTypesApi(1, 10, { search: "ron" })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/liquor-types?page=1&limit=10&search=ron",
      )
    })
  })

  describe("createLiquorTypeApi", () => {
    it("should POST /api/liquor-types", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockLiquorType))

      const data = { name: "Ron", abbreviation: "ron" }
      const result = await createLiquorTypeApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/liquor-types", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockLiquorType)
    })
  })

  describe("updateLiquorTypeApi", () => {
    it("should PATCH /api/liquor-types/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockLiquorType))

      const data = { name: "Whisky" }
      const result = await updateLiquorTypeApi("lt1", data)

      expect(authFetch).toHaveBeenCalledWith("/api/liquor-types/lt1", {
        method: "PATCH",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockLiquorType)
    })
  })

  describe("removeLiquorTypeApi", () => {
    it("should DELETE /api/liquor-types/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(undefined))

      await removeLiquorTypeApi("lt1")

      expect(authFetch).toHaveBeenCalledWith("/api/liquor-types/lt1", {
        method: "DELETE",
      })
    })
  })

  describe("fetchLiquorTypeOptionsApi", () => {
    it("should GET /api/liquor-types/options", async () => {
      const options = [{ id: "lt1", name: "Ron", abbreviation: "ron" }]
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(options))

      const result = await fetchLiquorTypeOptionsApi()

      expect(authFetch).toHaveBeenCalledWith("/api/liquor-types/options")
      expect(result).toEqual(options)
    })
  })
})
