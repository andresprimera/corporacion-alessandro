import {
  fetchClientsApi,
  createClientApi,
  updateClientApi,
  removeClientApi,
  fetchClientOptionsApi,
} from "@/lib/clients"
import { authFetch } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  authFetch: vi.fn(),
}))

const mockJsonResponse = (data: unknown): Response =>
  ({ json: () => Promise.resolve(data) }) as unknown as Response

describe("clients API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("fetchClientsApi", () => {
    it("should GET /api/clients with pagination params", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchClientsApi(2, 10)

      expect(authFetch).toHaveBeenCalledWith("/api/clients?page=2&limit=10")
    })

    it("should append salesPersonId when provided", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      )

      await fetchClientsApi(1, 10, { salesPersonId: "sp1" })

      expect(authFetch).toHaveBeenCalledWith(
        "/api/clients?page=1&limit=10&salesPersonId=sp1",
      )
    })
  })

  describe("createClientApi", () => {
    it("should POST /api/clients with the client payload", async () => {
      const client = { id: "c1" }
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(client))

      const data = {
        name: "Bodega Local",
        rif: "J-12345678-9",
        address: "Av. Principal",
        phone: "0414-1234567",
      }
      const result = await createClientApi(data)

      expect(authFetch).toHaveBeenCalledWith("/api/clients", {
        method: "POST",
        body: JSON.stringify(data),
      })
      expect(result).toEqual(client)
    })
  })

  describe("updateClientApi", () => {
    it("should PATCH /api/clients/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse({ id: "c1" }))

      const data = { name: "Renamed" }
      await updateClientApi("c1", data)

      expect(authFetch).toHaveBeenCalledWith("/api/clients/c1", {
        method: "PATCH",
        body: JSON.stringify(data),
      })
    })
  })

  describe("removeClientApi", () => {
    it("should DELETE /api/clients/:id", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse(undefined))

      await removeClientApi("c1")

      expect(authFetch).toHaveBeenCalledWith("/api/clients/c1", {
        method: "DELETE",
      })
    })
  })

  describe("fetchClientOptionsApi", () => {
    it("should GET /api/clients/options", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse([]))

      await fetchClientOptionsApi()

      expect(authFetch).toHaveBeenCalledWith("/api/clients/options")
    })
  })
})
