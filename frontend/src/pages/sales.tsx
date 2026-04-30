import { useState } from "react"
import { useTranslation } from "react-i18next"
import { i18n } from "@/lib/i18n"
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import type { Sale } from "@base-dashboard/shared"
import {
  downloadDeliveryOrderApi,
  downloadInvoiceApi,
  fetchSalesApi,
  removeSaleApi,
} from "@/lib/sales"
import { useAuth } from "@/hooks/use-auth"
import { SaleFormDialog } from "@/components/sale-form-dialog"
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
import { Skeleton } from "@/components/ui/skeleton"
import { DataPagination } from "@/components/data-pagination"
import {
  AlertCircleIcon,
  FileTextIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
} from "lucide-react"
import { toast } from "sonner"

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency,
  }).format(value)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(i18n.language)
}

export default function SalesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const deliveryOrderMutation = useMutation({
    mutationFn: downloadDeliveryOrderApi,
    onMutate: (id: string) => {
      setDownloadingId(id)
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to download delivery order"))
    },
    onSettled: () => setDownloadingId(null),
  })

  const invoiceMutation = useMutation({
    mutationFn: downloadInvoiceApi,
    onMutate: (id: string) => {
      setDownloadingId(id)
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to download invoice"))
    },
    onSettled: () => setDownloadingId(null),
  })

  function canPrint(sale: Sale): boolean {
    return user?.role === "admin" || user?.id === sale.soldBy.userId
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["sales", page, pageSize],
    queryFn: () => fetchSalesApi(page, pageSize),
    placeholderData: keepPreviousData,
  })

  const sales = data?.data ?? []
  const meta = data?.meta

  const deleteMutation = useMutation({
    mutationFn: removeSaleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["stock"] })
      toast.success(t("Sale deleted"))
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to delete sale"))
    },
  })

  function handleDelete() {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSettled: () => setDeleteId(null),
    })
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  const totalPages = meta?.totalPages ?? 1

  const header = (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("Sales")}</h2>
        <p className="text-muted-foreground">
          {t("Record sales drawn from one or more warehouses.")}
        </p>
      </div>
      <Button
        className="w-full md:w-auto"
        onClick={() => setFormOpen(true)}
      >
        <PlusIcon className="size-4" />
        {t("New sale")}
      </Button>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">
                  {t("Sale #")}
                </TableHead>
                <TableHead>{t("Client")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("Items")}
                </TableHead>
                <TableHead>{t("Total")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("Sold by")}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("Date")}
                </TableHead>
                <TableHead className="md:w-36">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircleIcon className="size-10 text-destructive" />
          <p className="text-muted-foreground">
            {t(error.message) || t("Failed to load sales.")}
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
      {header}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden md:table-cell">
                {t("Sale #")}
              </TableHead>
              <TableHead>{t("Client")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("Items")}
              </TableHead>
              <TableHead>{t("Total")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("Sold by")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {t("Date")}
              </TableHead>
              <TableHead className="md:w-36">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t("No sales found.")}
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale: Sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="hidden md:table-cell font-mono text-sm align-top whitespace-nowrap">
                    {sale.saleNumber}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="font-mono text-xs text-muted-foreground md:hidden">
                      {sale.saleNumber}
                    </div>
                    <div className="wrap-break-word">{sale.clientName}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-1 text-xs text-muted-foreground md:hidden">
                      <span>
                        {t("{{count}} item", { count: sale.items.length })}{" "}
                        ({sale.totalQty} {t("units")})
                      </span>
                      <span>·</span>
                      <span>{formatDate(sale.createdAt)}</span>
                      <span>·</span>
                      <span>{sale.soldBy.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {t("{{count}} item", { count: sale.items.length })}
                    <span className="text-muted-foreground">
                      {" "}
                      ({sale.totalQty} {t("units")})
                    </span>
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap">
                    {formatAmount(sale.totalAmount, sale.currency)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {sale.soldBy.name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(sale.createdAt)}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col items-end gap-1 md:flex-row md:items-center md:justify-start">
                      {canPrint(sale) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={downloadingId === sale.id}
                            onClick={() =>
                              deliveryOrderMutation.mutate(sale.id)
                            }
                          >
                            <TruckIcon className="size-4" />
                            <span className="sr-only">
                              {t("Delivery order")}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={downloadingId === sale.id}
                            onClick={() => invoiceMutation.mutate(sale.id)}
                          >
                            <FileTextIcon className="size-4" />
                            <span className="sr-only">{t("Invoice")}</span>
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(sale.id)}
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
          totalLabel={t("{{count}} sale total", { count: meta.total })}
          rowsId="rows-per-page"
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      <SaleFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete sale")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This will reverse the related inventory and remove the sale. This action cannot be undone.",
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
    </div>
  )
}
