import { fireEvent, render, screen } from "@testing-library/react"
import type { CartItem } from "@/hooks/use-sale-cart"
import { SaleCartDrawer } from "@/components/sale-cart-drawer"

let mockUserRole: "admin" | "salesPerson" | "user" | null = "salesPerson"

interface MockCart {
  items: CartItem[]
  totalQty: number
  totalAmount: number
  totalCurrency: "USD"
  isDrawerOpen: boolean
  openDrawer: ReturnType<typeof vi.fn>
  closeDrawer: ReturnType<typeof vi.fn>
  toggleDrawer: ReturnType<typeof vi.fn>
  addItem: ReturnType<typeof vi.fn>
  updateQty: ReturnType<typeof vi.fn>
  removeItem: ReturnType<typeof vi.fn>
  clearItems: ReturnType<typeof vi.fn>
  setCityId: ReturnType<typeof vi.fn>
  setClientId: ReturnType<typeof vi.fn>
  setNotes: ReturnType<typeof vi.fn>
  resetAll: ReturnType<typeof vi.fn>
  cityId: undefined
  clientId: ""
  notes: ""
}

const mockCart: MockCart = {
  items: [],
  totalQty: 0,
  totalAmount: 0,
  totalCurrency: "USD",
  isDrawerOpen: true,
  openDrawer: vi.fn(),
  closeDrawer: vi.fn(),
  toggleDrawer: vi.fn(),
  addItem: vi.fn(),
  updateQty: vi.fn(),
  removeItem: vi.fn(),
  clearItems: vi.fn(),
  setCityId: vi.fn(),
  setClientId: vi.fn(),
  setNotes: vi.fn(),
  resetAll: vi.fn(),
  cityId: undefined,
  clientId: "",
  notes: "",
}

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUserRole ? { id: "u1", role: mockUserRole } : null,
  }),
}))

vi.mock("@/hooks/use-sale-cart", () => ({
  useSaleCart: () => mockCart,
}))

vi.mock("@/components/sale-form-dialog", () => ({
  SaleFormDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="sale-form-dialog" /> : null,
}))

const liquor: CartItem = {
  productId: "p-liquor",
  productName: "Bacardi",
  productKind: "liquor",
  requestedQty: 2,
  unitPrice: 25,
  currency: "USD",
}

const grocery: CartItem = {
  productId: "p-grocery",
  productName: "Rice",
  productKind: "groceries",
  requestedQty: 1,
  unitPrice: 5,
  currency: "USD",
}

function resetCart(): void {
  mockCart.items = []
  mockCart.totalQty = 0
  mockCart.totalAmount = 0
  mockCart.isDrawerOpen = true
  mockCart.openDrawer.mockClear()
  mockCart.closeDrawer.mockClear()
  mockCart.toggleDrawer.mockClear()
  mockCart.addItem.mockClear()
  mockCart.updateQty.mockClear()
  mockCart.removeItem.mockClear()
  mockCart.clearItems.mockClear()
  mockCart.resetAll.mockClear()
}

describe("SaleCartDrawer", () => {
  beforeEach(() => {
    mockUserRole = "salesPerson"
    resetCart()
  })

  it("renders nothing for plain user role", () => {
    mockUserRole = "user"
    const { container } = render(<SaleCartDrawer />)
    expect(container.firstChild).toBeNull()
  })

  it("shows the empty state when items is empty", () => {
    render(<SaleCartDrawer />)
    expect(screen.getByText("Your cart is empty")).toBeTruthy()
  })

  it("renders one row per cart item with formatted subtotal", () => {
    mockCart.items = [liquor, grocery]
    mockCart.totalQty = 3
    mockCart.totalAmount = 55
    render(<SaleCartDrawer />)

    expect(screen.getByText("Bacardi")).toBeTruthy()
    expect(screen.getByText("Rice")).toBeTruthy()
    // 2 * 25 = 50 (subtotal for liquor row)
    expect(screen.getByText("$50.00")).toBeTruthy()
    // 1 * 5 = 5 — appears both as unit price and as subtotal for grocery row
    expect(screen.getAllByText("$5.00").length).toBeGreaterThanOrEqual(1)
  })

  it("decrement on a multi-qty row calls updateQty with qty - 1", () => {
    mockCart.items = [liquor]
    render(<SaleCartDrawer />)

    fireEvent.click(screen.getByLabelText("Decrease quantity"))

    expect(mockCart.updateQty).toHaveBeenCalledWith("p-liquor", 1)
  })

  it("decrement on a single-qty row calls removeItem", () => {
    mockCart.items = [grocery]
    render(<SaleCartDrawer />)

    fireEvent.click(screen.getByLabelText("Remove item"))

    expect(mockCart.removeItem).toHaveBeenCalledWith("p-grocery")
  })

  it("increment calls updateQty with qty + 1", () => {
    mockCart.items = [liquor]
    render(<SaleCartDrawer />)

    fireEvent.click(screen.getByLabelText("Increase quantity"))

    expect(mockCart.updateQty).toHaveBeenCalledWith("p-liquor", 3)
  })

  it("Clear order calls clearItems", () => {
    mockCart.items = [liquor]
    render(<SaleCartDrawer />)

    fireEvent.click(screen.getByRole("button", { name: "Clear order" }))

    expect(mockCart.clearItems).toHaveBeenCalledTimes(1)
  })

  it("Checkout opens the SaleFormDialog and closes the drawer", () => {
    mockCart.items = [liquor]
    render(<SaleCartDrawer />)

    expect(screen.queryByTestId("sale-form-dialog")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }))

    expect(mockCart.closeDrawer).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("sale-form-dialog")).toBeTruthy()
  })

  it("Clear order is disabled when items is empty", () => {
    render(<SaleCartDrawer />)
    const clearButton = screen.getByRole("button", { name: "Clear order" })
    expect((clearButton as HTMLButtonElement).disabled).toBe(true)
  })

  it("Checkout is disabled when items is empty", () => {
    render(<SaleCartDrawer />)
    const checkoutButton = screen.getByRole("button", { name: "Checkout" })
    expect((checkoutButton as HTMLButtonElement).disabled).toBe(true)
  })
})
