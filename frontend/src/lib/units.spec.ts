import {
  fetchUnitsApi,
  fetchUnitOptionsApi,
  createUnitApi,
  updateUnitApi,
  removeUnitApi,
} from "@/lib/units"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

const mockUnit = {
  id: "u1",
  name: "Botella",
  abbreviation: "bt",
  createdAt: "2026-04-28T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
}

describe("units API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchUnitsApi", () => {
    it("should GET /api/units with pagination", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchUnitsApi(1, 10)

      expect(authFetch).toHaveBeenCalledWith("/api/units?page=1&limit=10")
    })

    it("should include search when requested", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchUnitsApi(1, 10, { search: "botella" })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/units?page=1&limit=10&search=botella",
      )
    })
  })

  describe("createUnitApi", () => {
    it("should POST /api/units", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockUnit))

      const data = { name: "Botella", abbreviation: "bt" }
      const result = await createUnitApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/units", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockUnit)
    })
  })

  describe("updateUnitApi", () => {
    it("should PATCH /api/units/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockUnit))

      const data = { name: "Caja" }
      const result = await updateUnitApi("u1", data)

      expect(authFetch).toHaveBeenCalledWith("/api/units/u1", {
        method: "PATCH",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockUnit)
    })
  })

  describe("removeUnitApi", () => {
    it("should DELETE /api/units/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(undefined))

      await removeUnitApi("u1")

      expect(authFetch).toHaveBeenCalledWith("/api/units/u1", {
        method: "DELETE",
      })
    })
  })

  describe("fetchUnitOptionsApi", () => {
    it("should GET /api/units/options", async () => {
      const options = [{ id: "u1", name: "Botella", abbreviation: "bt" }]
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(options))

      const result = await fetchUnitOptionsApi()

      expect(authFetch).toHaveBeenCalledWith("/api/units/options")
      expect(result).toEqual(options)
    })
  })
})
