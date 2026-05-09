import {
  fetchPresentationsApi,
  fetchPresentationOptionsApi,
  createPresentationApi,
  updatePresentationApi,
  removePresentationApi,
} from "@/lib/presentations"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

const mockPresentation = {
  id: "p1",
  name: "750 ml",
  abbreviation: "750ml",
  createdAt: "2026-04-28T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
}

describe("presentations API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchPresentationsApi", () => {
    it("should GET /api/presentations with pagination", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchPresentationsApi(1, 10)

      expect(authFetch).toHaveBeenCalledWith(
        "/api/presentations?page=1&limit=10",
      )
    })

    it("should include search when requested", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchPresentationsApi(1, 10, { search: "750" })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/presentations?page=1&limit=10&search=750",
      )
    })
  })

  describe("createPresentationApi", () => {
    it("should POST /api/presentations", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockPresentation))

      const data = { name: "750 ml", abbreviation: "750ml" }
      const result = await createPresentationApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/presentations", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockPresentation)
    })
  })

  describe("updatePresentationApi", () => {
    it("should PATCH /api/presentations/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(mockPresentation))

      const data = { name: "1 Litro" }
      const result = await updatePresentationApi("p1", data)

      expect(authFetch).toHaveBeenCalledWith("/api/presentations/p1", {
        method: "PATCH",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(mockPresentation)
    })
  })

  describe("removePresentationApi", () => {
    it("should DELETE /api/presentations/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(undefined))

      await removePresentationApi("p1")

      expect(authFetch).toHaveBeenCalledWith("/api/presentations/p1", {
        method: "DELETE",
      })
    })
  })

  describe("fetchPresentationOptionsApi", () => {
    it("should GET /api/presentations/options", async () => {
      const options = [{ id: "p1", name: "750 ml", abbreviation: "750ml" }]
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(options))

      const result = await fetchPresentationOptionsApi()

      expect(authFetch).toHaveBeenCalledWith("/api/presentations/options")
      expect(result).toEqual(options)
    })
  })
})
