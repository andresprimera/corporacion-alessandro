import {
  fetchSalesApi,
  fetchSaleApi,
  createSaleApi,
  updateSaleApi,
  removeSaleApi,
  downloadDeliveryOrderApi,
  downloadInvoiceApi,
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

    it("should include cityId when provided (admin path)", async () => {
      vi.mocked(authFetch).mockResolvedValue(mockJsonResponse({ id: "s1" }))

      const data = {
        cityId: "city-1",
        clientId: "c1",
        items: [{ productId: "p1", requestedQty: 1, unitPrice: 1 }],
      }
      await createSaleApi(data)

      const body = vi.mocked(authFetch).mock.calls[0][1]?.body as string
      expect(JSON.parse(body)).toMatchObject({ cityId: "city-1" })
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

  describe("PDF downloads", () => {
    let createdAnchor: HTMLAnchorElement
    let createObjectURLSpy: ReturnType<typeof vi.fn>
    let revokeObjectURLSpy: ReturnType<typeof vi.fn>
    let createElementSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      createObjectURLSpy = vi.fn().mockReturnValue("blob:mock")
      revokeObjectURLSpy = vi.fn()
      vi.stubGlobal("URL", {
        ...URL,
        createObjectURL: createObjectURLSpy,
        revokeObjectURL: revokeObjectURLSpy,
      })

      createdAnchor = document.createElement("a")
      createdAnchor.click = vi.fn()
      createElementSpy = vi
        .spyOn(document, "createElement")
        .mockImplementation((tag: string) => {
          if (tag === "a") return createdAnchor
          return document.createElementNS(
            "http://www.w3.org/1999/xhtml",
            tag,
          ) as HTMLElement
        })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      createElementSpy.mockRestore()
    })

    function mockBlobResponse(headers: Record<string, string> = {}): Response {
      return {
        blob: () => Promise.resolve(new Blob(["pdf"])),
        headers: {
          get: (name: string) => headers[name.toLowerCase()] ?? null,
        },
      } as unknown as Response
    }

    describe("downloadDeliveryOrderApi", () => {
      it("hits the delivery-order endpoint and triggers a download", async () => {
        vi.mocked(authFetch).mockResolvedValue(
          mockBlobResponse({
            "content-disposition": 'attachment; filename="orden-entrega-S-2026-00001.pdf"',
          }),
        )

        await downloadDeliveryOrderApi("s1")

        expect(authFetch).toHaveBeenCalledWith("/api/sales/s1/delivery-order")
        expect(createObjectURLSpy).toHaveBeenCalled()
        expect(createdAnchor.download).toBe("orden-entrega-S-2026-00001.pdf")
        expect(createdAnchor.click).toHaveBeenCalled()
        expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock")
      })

      it("falls back to a default filename when content-disposition is missing", async () => {
        vi.mocked(authFetch).mockResolvedValue(mockBlobResponse({}))

        await downloadDeliveryOrderApi("s1")

        expect(createdAnchor.download).toBe("orden-entrega-s1.pdf")
      })
    })

    describe("downloadInvoiceApi", () => {
      it("hits the invoice endpoint and triggers a download", async () => {
        vi.mocked(authFetch).mockResolvedValue(
          mockBlobResponse({
            "content-disposition": 'attachment; filename="factura-S-2026-00001.pdf"',
          }),
        )

        await downloadInvoiceApi("s1")

        expect(authFetch).toHaveBeenCalledWith("/api/sales/s1/invoice")
        expect(createdAnchor.download).toBe("factura-S-2026-00001.pdf")
        expect(createdAnchor.click).toHaveBeenCalled()
      })
    })
  })
})
