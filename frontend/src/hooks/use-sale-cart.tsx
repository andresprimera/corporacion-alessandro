import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"
import {
  type Currency,
  type Product,
  type ProductKind,
  type ProductOption,
} from "@base-dashboard/shared"
import { useAuth } from "@/hooks/use-auth"

export interface CartItem {
  productId: string
  productName: string
  productKind: ProductKind
  requestedQty: number
  unitPrice: number
  currency: Currency
}

interface PersistedCart {
  cityId?: string
  clientId: string
  notes: string
  items: CartItem[]
}

const STORAGE_KEY_PREFIX = "sale-cart-v1:"

function loadCart(userId: string): PersistedCart | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`)
    if (!raw) return null
    return JSON.parse(raw) as PersistedCart
  } catch {
    return null
  }
}

function saveCart(userId: string, cart: PersistedCart): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${userId}`,
      JSON.stringify(cart),
    )
  } catch {
    // storage full or disabled — ignore
  }
}

function clearStoredCart(userId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`)
  } catch {
    // ignore
  }
}

interface SaleCartContextValue {
  items: CartItem[]
  cityId: string | undefined
  clientId: string
  notes: string

  addItem: (product: Product | ProductOption, qty?: number) => void
  updateQty: (productId: string, qty: number) => void
  removeItem: (productId: string) => void
  clearItems: () => void
  setCityId: (cityId: string | undefined) => void
  setClientId: (clientId: string) => void
  setNotes: (notes: string) => void
  resetAll: () => void

  totalQty: number
  totalAmount: number
  totalCurrency: Currency

  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
}

const SaleCartContext = createContext<SaleCartContextValue | null>(null)

export function SaleCartProvider({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const { user } = useAuth()
  const userId = user?.id

  const [items, setItems] = useState<CartItem[]>([])
  const [cityId, setCityIdState] = useState<string | undefined>(undefined)
  const [clientId, setClientIdState] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

  const hydratedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!userId || hydratedRef.current === userId) return
    hydratedRef.current = userId
    const saved = loadCart(userId)
    if (saved) {
      setItems(saved.items)
      setCityIdState(saved.cityId)
      setClientIdState(saved.clientId)
      setNotes(saved.notes)
    }
  }, [userId])

  useEffect(() => {
    if (!userId || hydratedRef.current !== userId) return
    saveCart(userId, { cityId, clientId, notes, items })
  }, [userId, cityId, clientId, notes, items])

  function addItem(
    product: Product | ProductOption,
    qty: number = 1,
  ): void {
    if (qty < 1) return
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, requestedQty: i.requestedQty + qty }
            : i,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productKind: product.kind,
          requestedQty: qty,
          unitPrice: product.price.value,
          currency: product.price.currency,
        },
      ]
    })
  }

  function updateQty(productId: string, qty: number): void {
    if (qty < 1) return
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, requestedQty: qty } : i,
      ),
    )
  }

  function removeItem(productId: string): void {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  function clearItems(): void {
    setItems([])
    setNotes("")
  }

  function setCityId(next: string | undefined): void {
    if (next !== cityId && items.length > 0) setItems([])
    setCityIdState(next)
  }

  function setClientId(next: string): void {
    setClientIdState(next)
  }

  function resetAll(): void {
    setItems([])
    setNotes("")
    setCityIdState(undefined)
    setClientIdState("")
    if (userId) clearStoredCart(userId)
  }

  const totalQty = items.reduce((s, i) => s + i.requestedQty, 0)
  const totalAmount = items.reduce(
    (s, i) => s + i.requestedQty * i.unitPrice,
    0,
  )
  const totalCurrency: Currency = items[0]?.currency ?? "USD"

  const value: SaleCartContextValue = {
    items,
    cityId,
    clientId,
    notes,
    addItem,
    updateQty,
    removeItem,
    clearItems,
    setCityId,
    setClientId,
    setNotes,
    resetAll,
    totalQty,
    totalAmount,
    totalCurrency,
    isDrawerOpen,
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),
    toggleDrawer: () => setIsDrawerOpen((v) => !v),
  }

  return (
    <SaleCartContext.Provider value={value}>
      {children}
    </SaleCartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSaleCart(): SaleCartContextValue {
  const ctx = useContext(SaleCartContext)
  if (!ctx) {
    throw new Error("useSaleCart must be used inside <SaleCartProvider>")
  }
  return ctx
}
