import { useState } from "react"
import { ProductFormDialog } from "@/components/product-form-dialog"
import { useTranslation } from "react-i18next"
import { i18n } from "@/lib/i18n"
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import { fetchProductsApi, removeProductApi } from "@/lib/products"
import type { Product } from "@base-dashboard/shared"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DataPagination } from "@/components/data-pagination"
import {
  AlertCircleIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { toast } from "sonner"

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency,
  }).format(value)
}

function formatPresentation(value: string, t: (key: string) => string): string {
  if (value === "L1") return t("1 L")
  if (value === "ML750") return t("750 ml")
  return value
}

function liquorTypeLabel(
  value: string,
  t: (key: string) => string,
): string {
  if (value === "rum") return t("Rum")
  if (value === "whisky") return t("Whisky")
  if (value === "vodka") return t("Vodka")
  if (value === "gin") return t("Gin")
  if (value === "tequila") return t("Tequila")
  return t("Other")
}

export default function ProductsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined,
  )
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["products", page, pageSize],
    queryFn: () => fetchProductsApi(page, pageSize),
    placeholderData: keepPreviousData,
  })

  const products = data?.data ?? []
  const meta = data?.meta

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => removeProductApi(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(t("Product deleted"))
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to delete product"))
    },
  })

  function handleAdd() {
    setEditingProduct(undefined)
    setFormOpen(true)
  }

  function handleEdit(product: Product) {
    setEditingProduct(product)
    setFormOpen(true)
  }

  function handleDelete() {
    if (!deleteProductId) return
    deleteMutation.mutate(deleteProductId, {
      onSettled: () => setDeleteProductId(null),
    })
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  const totalPages = meta?.totalPages ?? 1

  const heading = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("Products")}</h2>
        <p className="text-muted-foreground">
          {t("Manage groceries and liquor inventory.")}
        </p>
      </div>
      <Button onClick={handleAdd}>
        <PlusIcon className="size-4" />
        {t("Add Product")}
      </Button>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {heading}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Kind")}</TableHead>
                <TableHead>{t("Liquor type")}</TableHead>
                <TableHead>{t("Presentation")}</TableHead>
                <TableHead>{t("Price")}</TableHead>
                <TableHead className="w-32">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: Math.min(pageSize, 5) }).map(
                (_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="size-8" />
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {heading}
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircleIcon className="size-10 text-destructive" />
          <p className="text-muted-foreground">
            {t(error.message) || t("Failed to load products.")}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            {t("Try again")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {heading}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Kind")}</TableHead>
              <TableHead>{t("Liquor type")}</TableHead>
              <TableHead>{t("Presentation")}</TableHead>
              <TableHead>{t("Price")}</TableHead>
              <TableHead className="w-32">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("No products found.")}
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {p.kind === "liquor" ? t("Liquor") : t("Groceries")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.kind === "liquor" ? (
                      liquorTypeLabel(p.liquorType, t)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.kind === "liquor" ? (
                      formatPresentation(p.presentation, t)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatPrice(p.price.value, p.price.currency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(p)}
                      >
                        <PencilIcon className="size-4" />
                        <span className="sr-only">{t("Edit")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteProductId(p.id)}
                      >
                        <TrashIcon className="size-4" />
                        <span className="sr-only">{t("Delete")}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {meta && (
        <DataPagination
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalLabel={t("{{count}} product total", { count: meta.total })}
          rowsId="rows-per-page-products"
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      <AlertDialog
        open={deleteProductId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteProductId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete product")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This action cannot be undone. This will permanently delete the product.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("Deleting...") : t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
      />
    </div>
  )
}
