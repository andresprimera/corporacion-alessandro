import { useState } from "react"
import { useTranslation } from "react-i18next"
import { i18n } from "@/lib/i18n"
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import type { Sale, SaleStatus } from "@base-dashboard/shared"
import {
  downloadDeliveryOrderApi,
  downloadInvoiceApi,
  fetchSalesApi,
  removeSaleApi,
  updateSaleStatusApi,
} from "@/lib/sales"
import { useAuth } from "@/hooks/use-auth"
import { SaleFormDialog } from "@/components/sale-form-dialog"
import { SaleNotesDialog } from "@/components/sale-notes-dialog"
import { SalePaymentFormDialog } from "@/components/sale-payment-form-dialog"
import { SalePaymentDetailDialog } from "@/components/sale-payment-detail-dialog"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataPagination } from "@/components/data-pagination"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  EyeIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
  TruckIcon,
  XCircleIcon,
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
  const [editSale, setEditSale] = useState<Sale | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<
    { sale: Sale; next: "confirmed" | "payment_rejected" } | null
  >(null)
  const [paymentSale, setPaymentSale] = useState<Sale | null>(null)
  const [proofSale, setProofSale] = useState<Sale | null>(null)

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

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: "confirmed" | "payment_rejected"
    }) => updateSaleStatusApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      toast.success(t("Sale status updated"))
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to update sale status"))
    },
  })

  function handleDelete() {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSettled: () => setDeleteId(null),
    })
  }

  function handleStatusConfirm() {
    if (!pendingStatus) return
    statusMutation.mutate(
      { id: pendingStatus.sale.id, status: pendingStatus.next },
      { onSettled: () => setPendingStatus(null) },
    )
  }

  const isAdmin = user?.role === "admin"
  function isOwner(sale: Sale): boolean {
    return user?.id === sale.soldBy.userId
  }
  function canSubmitPayment(sale: Sale): boolean {
    return (
      isOwner(sale) &&
      (sale.status === "placed" || sale.status === "payment_rejected")
    )
  }
  function canConfirmPayment(sale: Sale): boolean {
    return isAdmin && sale.status === "paid"
  }
  function canRejectPayment(sale: Sale): boolean {
    return isAdmin && sale.status === "paid"
  }
  function canViewProof(sale: Sale): boolean {
    return sale.paymentProof !== undefined && (isAdmin || isOwner(sale))
  }
  function canDelete(sale: Sale): boolean {
    return sale.status === "placed"
  }

  function renderStatusBadge(status: SaleStatus) {
    switch (status) {
      case "placed":
        return <Badge variant="secondary">{t("Placed")}</Badge>
      case "paid":
        return <Badge variant="default">{t("Paid")}</Badge>
      case "confirmed":
        return (
          <Badge variant="default">
            <CheckCircle2Icon /> {t("Confirmed")}
          </Badge>
        )
      case "payment_rejected":
        return (
          <Badge variant="destructive">{t("Payment rejected")}</Badge>
        )
    }
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
                  {t("Status")}
                </TableHead>
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
                <TableCell colSpan={8} className="h-24 text-center">
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
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground md:hidden">
                      <span>
                        {t("{{count}} item", { count: sale.items.length })}{" "}
                        ({sale.totalQty} {t("units")})
                      </span>
                      <span>·</span>
                      <span>{formatDate(sale.createdAt)}</span>
                      <span>·</span>
                      <span>{sale.soldBy.name}</span>
                      <span>·</span>
                      {renderStatusBadge(sale.status)}
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
                    {renderStatusBadge(sale.status)}
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditSale(sale)}
                          >
                            <PencilIcon className="size-4" />
                            <span className="sr-only">
                              {t("Edit sale notes")}
                            </span>
                          </Button>
                        </>
                      )}
                      {canSubmitPayment(sale) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPaymentSale(sale)}
                        >
                          <ReceiptIcon className="size-4" />
                          <span className="sr-only">
                            {sale.status === "payment_rejected"
                              ? t("Resubmit payment")
                              : t("Submit payment")}
                          </span>
                        </Button>
                      )}
                      {canViewProof(sale) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setProofSale(sale)}
                        >
                          <EyeIcon className="size-4" />
                          <span className="sr-only">
                            {t("View payment proof")}
                          </span>
                        </Button>
                      )}
                      {canConfirmPayment(sale) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setPendingStatus({ sale, next: "confirmed" })
                          }
                        >
                          <CheckCircle2Icon className="size-4" />
                          <span className="sr-only">
                            {t("Confirm payment")}
                          </span>
                        </Button>
                      )}
                      {canRejectPayment(sale) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setPendingStatus({
                              sale,
                              next: "payment_rejected",
                            })
                          }
                        >
                          <XCircleIcon className="size-4" />
                          <span className="sr-only">
                            {t("Reject payment")}
                          </span>
                        </Button>
                      )}
                      {canDelete(sale) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(sale.id)}
                        >
                          <TrashIcon className="size-4" />
                          <span className="sr-only">{t("Delete")}</span>
                        </Button>
                      )}
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
      <SaleNotesDialog sale={editSale} onClose={() => setEditSale(null)} />
      <SalePaymentFormDialog
        sale={paymentSale}
        onClose={() => setPaymentSale(null)}
      />
      <SalePaymentDetailDialog
        sale={proofSale}
        onClose={() => setProofSale(null)}
      />
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
      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Change sale status")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus?.next === "confirmed"
                ? t("Confirm payment for sale {{number}}?", {
                    number: pendingStatus.sale.saleNumber,
                  })
                : t("Reject payment for sale {{number}}?", {
                    number: pendingStatus?.sale.saleNumber ?? "",
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusConfirm}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? t("Saving...") : t("Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
