import {
  type Product,
  type ProductOption,
  type PaginatedResponse,
  type ProductKind,
  type LiquorType,
  type CreateProductInput,
  type UpdateProductInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export interface FetchProductsArgs {
  page: number
  limit: number
  kind?: ProductKind
  liquorType?: LiquorType
  minPrice?: number
  maxPrice?: number
  search?: string
}

export async function fetchProductsApi(
  args: FetchProductsArgs,
): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  })
  if (args.kind) params.set("kind", args.kind)
  if (args.liquorType) params.set("liquorType", args.liquorType)
  if (args.minPrice !== undefined) params.set("minPrice", String(args.minPrice))
  if (args.maxPrice !== undefined) params.set("maxPrice", String(args.maxPrice))
  if (args.search) params.set("search", args.search)
  const res = await authFetch(`/api/products?${params}`)
  return res.json()
}

export async function createProductApi(
  data: CreateProductInput,
): Promise<Product> {
  const res = await authFetch("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateProductApi(
  id: string,
  data: UpdateProductInput,
): Promise<Product> {
  const res = await authFetch(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function removeProductApi(id: string): Promise<void> {
  await authFetch(`/api/products/${id}`, { method: "DELETE" })
}

export async function fetchProductOptionsApi(): Promise<ProductOption[]> {
  const res = await authFetch("/api/products/options")
  return res.json()
}
