import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  SaleCartProvider,
  useSaleCart,
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

const liquor: Product = {
  id: "p-liquor",
  kind: "liquor",
  name: "Bacardi",
  price: { value: 25, currency: "USD" },
  liquorType: "rum",
  presentation: "L1",
}

const grocery: Product = {
  id: "p-grocery",
  kind: "groceries",
  name: "Rice",
  price: { value: 5, currency: "USD" },
}

const groceryOption: ProductOption = {
  id: "p-grocery",
  kind: "groceries",
  name: "Rice",
  price: { value: 5, currency: "USD" },
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

    act(() => result.current.addItem(liquor, 2))

    expect(result.current.items).toEqual([
      {
        productId: "p-liquor",
        productName: "Bacardi",
        productKind: "liquor",
        requestedQty: 2,
        unitPrice: 25,
        currency: "USD",
      },
    ])
  })

  it("addItem on an existing product increments requestedQty", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, 1))
    act(() => result.current.addItem(liquor, 3))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].requestedQty).toBe(4)
  })

  it("addItem accepts a ProductOption", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(groceryOption, 2))

    expect(result.current.items[0].productId).toBe("p-grocery")
    expect(result.current.items[0].requestedQty).toBe(2)
  })

  it("updateQty updates the matching line and ignores qty < 1", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, 1))
    act(() => result.current.updateQty("p-liquor", 7))
    expect(result.current.items[0].requestedQty).toBe(7)

    act(() => result.current.updateQty("p-liquor", 0))
    expect(result.current.items[0].requestedQty).toBe(7)
  })

  it("removeItem removes only the matching line", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, 1))
    act(() => result.current.addItem(grocery, 1))
    act(() => result.current.removeItem("p-liquor"))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].productId).toBe("p-grocery")
  })

  it("clearItems empties items and notes", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, 1))
    act(() => result.current.setNotes("hello"))
    act(() => result.current.clearItems())

    expect(result.current.items).toEqual([])
    expect(result.current.notes).toBe("")
  })

  it("setCityId clears items when city changes and items is non-empty", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.setCityId("city-a"))
    act(() => result.current.addItem(liquor, 1))
    act(() => result.current.setCityId("city-b"))

    expect(result.current.cityId).toBe("city-b")
    expect(result.current.items).toEqual([])
  })

  it("setClientId clears items when client changes and items is non-empty", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.setClientId("client-a"))
    act(() => result.current.addItem(liquor, 1))
    act(() => result.current.setClientId("client-b"))

    expect(result.current.clientId).toBe("client-b")
    expect(result.current.items).toEqual([])
  })

  it("derives totalQty, totalAmount and totalCurrency from items", () => {
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, 2)) // 2 * 25 = 50
    act(() => result.current.addItem(grocery, 3)) // 3 * 5 = 15

    expect(result.current.totalQty).toBe(5)
    expect(result.current.totalAmount).toBe(65)
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

  it("persists cart to localStorage under sale-cart-v1:<userId>", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, 1))

    const writes = setItemSpy.mock.calls.filter(
      ([key]) => key === "sale-cart-v1:user-1",
    )
    expect(writes.length).toBeGreaterThan(0)
    const lastPayload = JSON.parse(writes[writes.length - 1][1])
    expect(lastPayload.items).toHaveLength(1)
    expect(lastPayload.items[0].productId).toBe("p-liquor")
  })

  it("hydrates from localStorage when a saved cart exists for the user", () => {
    localStorage.setItem(
      "sale-cart-v1:user-1",
      JSON.stringify({
        cityId: "city-a",
        clientId: "client-a",
        notes: "old notes",
        items: [
          {
            productId: "p-liquor",
            productName: "Bacardi",
            productKind: "liquor",
            requestedQty: 4,
            unitPrice: 25,
            currency: "USD",
          },
        ],
      }),
    )

    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].requestedQty).toBe(4)
    expect(result.current.cityId).toBe("city-a")
    expect(result.current.clientId).toBe("client-a")
    expect(result.current.notes).toBe("old notes")
  })

  it("resetAll empties state and removes the localStorage entry", () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem")
    const { result } = renderHook(() => useSaleCart(), { wrapper: wrap })

    act(() => result.current.addItem(liquor, 1))
    act(() => result.current.setNotes("hello"))
    act(() => result.current.setCityId("city-a"))
    act(() => result.current.setClientId("client-a"))

    act(() => result.current.resetAll())

    expect(result.current.items).toEqual([])
    expect(result.current.notes).toBe("")
    expect(result.current.cityId).toBeUndefined()
    expect(result.current.clientId).toBe("")
    expect(removeItemSpy).toHaveBeenCalledWith("sale-cart-v1:user-1")
  })
})
