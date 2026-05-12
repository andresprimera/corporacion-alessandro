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
import { cartItemBasicQty } from "@/lib/sales"

export interface CartItemUnit {
  id: string
  name: string
  abbreviation: string
}

export interface CartItem {
  productId: string
  productName: string
  productKind: ProductKind
  enteredQty: number
  enteredUnit: CartItemUnit
  isPackage: boolean
  unitsPerPackage?: number
  basicUnit?: CartItemUnit
  packageUnit?: CartItemUnit
  unitPrice: number
  currency: Currency
}

interface PersistedCart {
  clientId: string
  notes: string
  items: CartItem[]
}

const STORAGE_KEY_PREFIX = "sale-cart-v2:"

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

export interface AddItemOptions {
  qty: number
  unit: CartItemUnit
  isPackage: boolean
  unitsPerPackage?: number
  basicUnit?: CartItemUnit
  packageUnit?: CartItemUnit
}

type CartProduct = Product | ProductOption

interface SaleCartContextValue {
  items: CartItem[]
  clientId: string
  notes: string

  addItem: (product: CartProduct, opts: AddItemOptions) => void
  updateQty: (productId: string, unitId: string, qty: number) => void
  removeItem: (productId: string, unitId: string) => void
  clearItems: () => void
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
      setClientIdState(saved.clientId)
      setNotes(saved.notes)
    }
  }, [userId])

  useEffect(() => {
    if (!userId || hydratedRef.current !== userId) return
    saveCart(userId, { clientId, notes, items })
  }, [userId, clientId, notes, items])

  function addItem(product: CartProduct, opts: AddItemOptions): void {
    if (opts.qty < 1) return
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === product.id && i.enteredUnit.id === opts.unit.id,
      )
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id && i.enteredUnit.id === opts.unit.id
            ? { ...i, enteredQty: i.enteredQty + opts.qty }
            : i,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productKind: product.kind,
          enteredQty: opts.qty,
          enteredUnit: opts.unit,
          isPackage: opts.isPackage,
          unitsPerPackage: opts.unitsPerPackage,
          basicUnit: opts.basicUnit,
          packageUnit: opts.packageUnit,
          unitPrice: product.price.value,
          currency: product.price.currency,
        },
      ]
    })
  }

  function updateQty(productId: string, unitId: string, qty: number): void {
    if (qty < 1) return
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.enteredUnit.id === unitId
          ? { ...i, enteredQty: qty }
          : i,
      ),
    )
  }

  function removeItem(productId: string, unitId: string): void {
    setItems((prev) =>
      prev.filter(
        (i) => !(i.productId === productId && i.enteredUnit.id === unitId),
      ),
    )
  }

  function clearItems(): void {
    setItems([])
    setNotes("")
  }

  function setClientId(next: string): void {
    setClientIdState(next)
  }

  function resetAll(): void {
    setItems([])
    setNotes("")
    setClientIdState("")
    if (userId) clearStoredCart(userId)
  }

  const totalQty = items.reduce((s, i) => s + cartItemBasicQty(i), 0)
  const totalAmount = items.reduce(
    (s, i) => s + cartItemBasicQty(i) * i.unitPrice,
    0,
  )
  const totalCurrency: Currency = items[0]?.currency ?? "USD"

  const value: SaleCartContextValue = {
    items,
    clientId,
    notes,
    addItem,
    updateQty,
    removeItem,
    clearItems,
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
