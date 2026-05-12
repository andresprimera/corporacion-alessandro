import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  SaleCartProvider,
  useSaleCart,
  type AddItemOptions,
} from "@/hooks/use-sale-cart"
import type { Product, ProductOption, User } from "@base-dashboard/shared"

const mockUser: User = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role: "salesPerson",
  status: "active",
} as unknown as User

let currentUser: User | null = mockUser

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: currentUser }),
}))

const BASIC_UNIT = {
  id: "u-bottle",
  name: "Botella",
  abbreviation: "bta",
}

const PACKAGE_UNIT = {
  id: "u-case",
  name: "Caja",
  abbreviation: "cja",
}

const GROCERY_UNIT = {
  id: "u-unit",
  name: "Unidad",
  abbreviation: "und",
}

const liquor: Product = {
  id: "p-liquor",
  kind: "liquor",
  name: "Bacardi",
  price: { value: 25, currency: "USD" },
  liquorTypeId: "lt-rum",
  liquorType: { id: "lt-rum", name: "Ron", abbreviation: "ron" },
  presentationId: "pres-1l",
  presentation: { id: "pres-1l", name: "1 Litro", abbreviation: "1L" },
  basicUnitId: BASIC_UNIT.id,
}

const grocery: Product = {
  id: "p-grocery",
  kind: "groceries",
  name: "Rice",
  price: { value: 5, currency: "USD" },
  basicUnitId: GROCERY_UNIT.id,
}

const groceryOption: ProductOption = {
  id: "p-grocery",
  kind: "groceries",
  name: "Rice",
  price: { value: 5, currency: "USD" },
  basicUnitId: GROCERY_UNIT.id,
}

const liquorBasicOpts: AddItemOptions = {
  qty: 1,
  unit: BASIC_UNIT,
  isPackage: false,
}

const liquorPackageOpts: AddItemOptions = {
  qty: 1,
  unit: PACKAGE_UNIT,
  isPackage: true,
  unitsPerPackage: 12,
}

const groceryOpts: AddItemOptions = {
  qty: 1,
  unit: GROCERY_UNIT,
  isPackage: false,
}

function wrap({ children }: { children: ReactNode }) {
  return <SaleCartProvider>{children}</SaleCartProvider>
}

describe("useSaleCart", () => {
  beforeEach(() => {
    currentUser = mockUser
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("throws when used outside the provider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => renderHook(() => useSaleCart())).toThrow(
      "useSaleCart must be used inside <SaleCartProvider>",
    )
    errorSpy.mockRestore()
  })

  it("addItem adds a new line with stamped product fields", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, { ...liquorBasicOpts, qty: 2 }))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({
      productId: "p-liquor",
      productName: "Bacardi",
      productKind: "liquor",
      enteredQty: 2,
      enteredUnit: BASIC_UNIT,
      isPackage: false,
      unitPrice: 25,
      currency: "USD",
    })
  })

  it("addItem on the same product + unit increments enteredQty", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, liquorBasicOpts))
    act(() => result.current.addItem(liquor, { ...liquorBasicOpts, qty: 3 }))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].enteredQty).toBe(4)
  })

  it("addItem with a different unit creates a separate cart line", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, liquorBasicOpts))
    act(() => result.current.addItem(liquor, liquorPackageOpts))

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0].enteredUnit.id).toBe(BASIC_UNIT.id)
    expect(result.current.items[1].enteredUnit.id).toBe(PACKAGE_UNIT.id)
  })

  it("addItem accepts a ProductOption", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() =>
      result.current.addItem(groceryOption, { ...groceryOpts, qty: 2 }),
    )

    expect(result.current.items[0].productId).toBe("p-grocery")
    expect(result.current.items[0].enteredQty).toBe(2)
  })

  it("updateQty updates the matching line by (productId, unitId) and ignores qty < 1", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, liquorBasicOpts))
    act(() => result.current.updateQty("p-liquor", BASIC_UNIT.id, 7))
    expect(result.current.items[0].enteredQty).toBe(7)

    act(() => result.current.updateQty("p-liquor", BASIC_UNIT.id, 0))
    expect(result.current.items[0].enteredQty).toBe(7)
  })

  it("removeItem removes only the matching line", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, liquorBasicOpts))
    act(() => result.current.addItem(grocery, groceryOpts))
    act(() => result.current.removeItem("p-liquor", BASIC_UNIT.id))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].productId).toBe("p-grocery")
  })

  it("clearItems empties items and notes", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, liquorBasicOpts))
    act(() => result.current.setNotes("hello"))
    act(() => result.current.clearItems())

    expect(result.current.items).toEqual([])
    expect(result.current.notes).toBe("")
  })

  it("setClientId preserves items when client changes", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.setClientId("client-a"))
    act(() => result.current.addItem(liquor, liquorBasicOpts))
    act(() => result.current.setClientId("client-b"))

    expect(result.current.clientId).toBe("client-b")
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].productId).toBe(liquor.id)
  })

  it("derives totalQty, totalAmount and totalCurrency from items (basic-unit math)", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    // 2 botellas × $25 = $50, qty 2 basic
    act(() =>
      result.current.addItem(liquor, { ...liquorBasicOpts, qty: 2 }),
    )
    // 3 cajas × 12 = 36 basic units × $25 = $900
    act(() =>
      result.current.addItem(liquor, { ...liquorPackageOpts, qty: 3 }),
    )

    expect(result.current.totalQty).toBe(38)
    expect(result.current.totalAmount).toBe(950)
    expect(result.current.totalCurrency).toBe("USD")
  })

  it("totalCurrency falls back to USD when cart is empty", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    expect(result.current.totalQty).toBe(0)
    expect(result.current.totalAmount).toBe(0)
    expect(result.current.totalCurrency).toBe("USD")
  })

  it("openDrawer / closeDrawer / toggleDrawer flip isDrawerOpen", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    expect(result.current.isDrawerOpen).toBe(false)
    act(() => result.current.openDrawer())
    expect(result.current.isDrawerOpen).toBe(true)
    act(() => result.current.closeDrawer())
    expect(result.current.isDrawerOpen).toBe(false)
    act(() => result.current.toggleDrawer())
    expect(result.current.isDrawerOpen).toBe(true)
  })

  it("persists cart to localStorage under sale-cart-v2:<userId>", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, liquorBasicOpts))

    const writes = setItemSpy.mock.calls.filter(
      ([key]) => key === "sale-cart-v2:user-1",
    )
    expect(writes.length).toBeGreaterThan(0)
    const lastPayload = JSON.parse(writes[writes.length - 1][1])
    expect(lastPayload.items).toHaveLength(1)
    expect(lastPayload.items[0].productId).toBe("p-liquor")
    expect(lastPayload.items[0].enteredQty).toBe(1)
  })

  it("hydrates from localStorage when a v2 saved cart exists for the user", () => {
    localStorage.setItem(
      "sale-cart-v2:user-1",
      JSON.stringify({
        clientId: "client-a",
        notes: "old notes",
        items: [
          {
            productId: "p-liquor",
            productName: "Bacardi",
            productKind: "liquor",
            enteredQty: 4,
            enteredUnit: BASIC_UNIT,
            isPackage: false,
            unitPrice: 25,
            currency: "USD",
          },
        ],
      }),
    )

    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].enteredQty).toBe(4)
    expect(result.current.clientId).toBe("client-a")
    expect(result.current.notes).toBe("old notes")
  })

  it("ignores v1 carts and starts empty", () => {
    localStorage.setItem(
      "sale-cart-v1:user-1",
      JSON.stringify({
        clientId: "client-a",
        notes: "v1",
        items: [
          { productId: "p-liquor", requestedQty: 1, unitPrice: 25 },
        ],
      }),
    )

    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    expect(result.current.items).toEqual([])
    expect(result.current.clientId).toBe("")
  })

  it("resetAll empties state and removes the localStorage entry", () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem")
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, liquorBasicOpts))
    act(() => result.current.setNotes("hello"))
    act(() => result.current.setClientId("client-a"))

    act(() => result.current.resetAll())

    expect(result.current.items).toEqual([])
    expect(result.current.notes).toBe("")
    expect(result.current.clientId).toBe("")
    expect(removeItemSpy).toHaveBeenCalledWith("sale-cart-v2:user-1")
  })
})
