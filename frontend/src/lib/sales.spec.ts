import {
  fetchSalesApi,
  fetchSaleApi,
  createSaleApi,
  updateSaleApi,
  updateSaleStatusApi,
  submitSalePaymentApi,
  downloadPaymentProofApi,
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
            enteredQty: 10,
            enteredUnitId: "u1",
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

  describe("updateSaleStatusApi", () => {
    it("should PATCH /api/sales/:id/status with confirmed", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({ id: "s1", status: "confirmed" }),
      )

      const result = await updateSaleStatusApi("s1", "confirmed")

      expect(authFetch).toHaveBeenCalledWith("/api/sales/s1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed" }),
      })
      expect(result).toEqual({ id: "s1", status: "confirmed" })
    })

    it("should PATCH with payment_rejected", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({ id: "s1", status: "payment_rejected" }),
      )

      await updateSaleStatusApi("s1", "payment_rejected")

      expect(authFetch).toHaveBeenCalledWith("/api/sales/s1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "payment_rejected" }),
      })
    })
  })

  describe("submitSalePaymentApi", () => {
    it("POSTs FormData with image, bank, paymentType, paymentNumber, and paymentDate", async () => {
      vi.mocked(authFetch).mockResolvedValue(
        mockJsonResponse({ id: "s1", status: "paid" }),
      )
      const file = new File(["png-bytes"], "proof.png", { type: "image/png" })

      await submitSalePaymentApi("s1", {
        image: file,
        bank: "Banco de Venezuela",
        paymentType: "pago_movil",
        paymentNumber: "TX-12345",
        paymentDate: "2026-05-11",
      })

      expect(authFetch).toHaveBeenCalledTimes(1)
      const [url, opts] = vi.mocked(authFetch).mock.calls[0]
      expect(url).toBe("/api/sales/s1/payment")
      expect(opts?.method).toBe("POST")
      expect(opts?.body).toBeInstanceOf(FormData)

      const fd = opts!.body as FormData
      expect(fd.get("image")).toBe(file)
      expect(fd.get("bank")).toBe("Banco de Venezuela")
      expect(fd.get("paymentType")).toBe("pago_movil")
      expect(fd.get("paymentNumber")).toBe("TX-12345")
      expect(fd.get("paymentDate")).toBe("2026-05-11")
    })
  })

  describe("downloadPaymentProofApi", () => {
    it("GETs /api/sales/:id/payment-proof and returns the blob + mime type", async () => {
      const blob = new Blob(["bytes"], { type: "image/png" })
      vi.mocked(authFetch).mockResolvedValue({
        blob: () => Promise.resolve(blob),
        headers: {
          get: (n: string) =>
            n.toLowerCase() === "content-type" ? "image/png" : null,
        },
      } as unknown as Response)

      const result = await downloadPaymentProofApi("s1")

      expect(authFetch).toHaveBeenCalledWith("/api/sales/s1/payment-proof")
      expect(result.blob).toBe(blob)
      expect(result.mimeType).toBe("image/png")
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
