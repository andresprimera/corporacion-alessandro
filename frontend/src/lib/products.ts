import {
  type Product,
  type ProductOption,
  type PaginatedResponse,
  type CreateProductInput,
  type UpdateProductInput,
} from "@base-dashboard/shared"
import { authFetch } from "@/lib/api"

export async function fetchProductsApi(
  page: number,
  limit: number,
): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
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
