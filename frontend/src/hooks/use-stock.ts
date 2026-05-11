import { useMemo } from "react"
import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import type {
  PaginatedResponse,
  ProductStockAggregated,
} from "@base-dashboard/shared"
import { fetchStockAggregatedApi } from "@/lib/inventory"

export interface UseStockResult {
  query: UseQueryResult<PaginatedResponse<ProductStockAggregated>>
  getAvailable: (productId: string) => number | undefined
}

export function useStock(): UseStockResult {
  const query = useQuery({
    queryKey: ["stock", "aggregated", "all"],
    queryFn: () => fetchStockAggregatedApi(1, 1000),
    staleTime: 30_000,
  })

  const map = useMemo(
    () =>
      new Map<string, number>(
        (query.data?.data ?? []).map((e) => [e.productId, e.totalQty]),
      ),
    [query.data],
  )

  function getAvailable(productId: string): number | undefined {
    if (query.data === undefined) return undefined
    return map.get(productId) ?? 0
  }

  return { query, getAvailable }
}
