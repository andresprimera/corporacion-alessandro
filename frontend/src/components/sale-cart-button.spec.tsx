import { fireEvent, render, screen } from "@testing-library/react"
import { SaleCartButton } from "@/components/sale-cart-button"

const openDrawerMock = vi.fn()

let mockUserRole: "admin" | "salesPerson" | "user" | null = "salesPerson"
let mockTotalQty = 0

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUserRole ? { id: "u1", role: mockUserRole } : null,
  }),
}))

vi.mock("@/hooks/use-sale-cart", () => ({
  useSaleCart: () => ({
    totalQty: mockTotalQty,
    openDrawer: openDrawerMock,
  }),
}))

describe("SaleCartButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserRole = "salesPerson"
    mockTotalQty = 0
  })

  it("renders nothing for plain user role", () => {
    mockUserRole = "user"
    const { container } = render(<SaleCartButton />)
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when user is unauthenticated", () => {
    mockUserRole = null
    const { container } = render(<SaleCartButton />)
    expect(container.firstChild).toBeNull()
  })

  it("renders without badge when totalQty is zero", () => {
    mockTotalQty = 0
    render(<SaleCartButton />)
    const button = screen.getByRole("button", { name: /open order cart/i })
    expect(button).toBeTruthy()
    expect(button.textContent).toBe("")
  })

  it("renders the count badge when totalQty > 0", () => {
    mockTotalQty = 3
    render(<SaleCartButton />)
    expect(screen.getByText("3")).toBeTruthy()
  })

  it("renders 99+ when totalQty exceeds 99", () => {
    mockTotalQty = 250
    render(<SaleCartButton />)
    expect(screen.getByText("99+")).toBeTruthy()
  })

  it("calls openDrawer on click", () => {
    render(<SaleCartButton />)

    fireEvent.click(screen.getByRole("button", { name: /open order cart/i }))

    expect(openDrawerMock).toHaveBeenCalledTimes(1)
  })
})
