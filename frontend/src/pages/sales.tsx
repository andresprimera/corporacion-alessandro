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
  markSaleDeliveredApi,
  removeSaleApi,
  updateSaleStatusApi,
} from "@/lib/sales"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchSalesPersonOptionsApi,
  salesPersonOptionsQueryKey,
} from "@/lib/users"
import { SaleFormDialog } from "@/components/sale-form-dialog"
import { SaleNotesDialog } from "@/components/sale-notes-dialog"
import { SalePaymentFormDialog } from "@/components/sale-payment-form-dialog"
import { SalePaymentDetailDialog } from "@/components/sale-payment-detail-dialog"
import { SalesDispatchSummaryDialog } from "@/components/sales-dispatch-summary-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { DataPagination } from "@/components/data-pagination"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  EyeIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  PackageCheckIcon,
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

const SALES_PERSON_FILTER_ALL = "__all__"

export default function SalesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>(
    SALES_PERSON_FILTER_ALL,
  )
  const [formOpen, setFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editSale, setEditSale] = useState<Sale | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<
    { sale: Sale; next: "confirmed" | "payment_rejected" } | null
  >(null)
  const [paymentSale, setPaymentSale] = useState<Sale | null>(null)
  const [proofSale, setProofSale] = useState<Sale | null>(null)
  const [pendingDeliveryId, setPendingDeliveryId] = useState<string | null>(
    null,
  )
  const [summaryOpen, setSummaryOpen] = useState(false)

  const filterSoldByUserId =
    isAdmin && salesPersonFilter !== SALES_PERSON_FILTER_ALL
      ? salesPersonFilter
      : undefined

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
    queryKey: ["sales", page, pageSize, filterSoldByUserId ?? null],
    queryFn: () =>
      fetchSalesApi(page, pageSize, { soldByUserId: filterSoldByUserId }),
    placeholderData: keepPreviousData,
  })

  const salesPersonsQuery = useQuery({
    queryKey: salesPersonOptionsQueryKey,
    queryFn: fetchSalesPersonOptionsApi,
    enabled: isAdmin,
  })

  const sales = data?.data ?? []
  const meta = data?.meta
  const salesPersons = salesPersonsQuery.data ?? []

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

  const deliveryMutation = useMutation({
    mutationFn: markSaleDeliveredApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      toast.success(t("Sale marked as delivered"))
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to mark sale as delivered"))
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

  function handleDeliveryConfirm() {
    if (!pendingDeliveryId) return
    deliveryMutation.mutate(pendingDeliveryId, {
      onSettled: () => setPendingDeliveryId(null),
    })
  }

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
  function canMarkDelivered(sale: Sale): boolean {
    return isAdmin && !sale.delivered
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

  function handleSalesPersonFilterChange(value: string | null) {
    setSalesPersonFilter(value ?? SALES_PERSON_FILTER_ALL)
    setPage(1)
  }

  const totalPages = meta?.totalPages ?? 1

  function renderActions(sale: Sale) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" />}
        >
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">{t("Open menu")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-auto [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:self-center *:data-[slot=dropdown-menu-item]:whitespace-nowrap"
        >
          {canPrint(sale) && (
            <>
              <DropdownMenuItem
                disabled={downloadingId === sale.id}
                onClick={() => deliveryOrderMutation.mutate(sale.id)}
              >
                <TruckIcon />
                <span>{t("Delivery order")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={downloadingId === sale.id}
                onClick={() => invoiceMutation.mutate(sale.id)}
              >
                <FileTextIcon />
                <span>{t("Invoice")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditSale(sale)}>
                <PencilIcon />
                <span>{t("Edit sale notes")}</span>
              </DropdownMenuItem>
            </>
          )}
          {canSubmitPayment(sale) && (
            <DropdownMenuItem onClick={() => setPaymentSale(sale)}>
              <ReceiptIcon />
              <span>
                {sale.status === "payment_rejected"
                  ? t("Resubmit payment")
                  : t("Submit payment")}
              </span>
            </DropdownMenuItem>
          )}
          {canViewProof(sale) && (
            <DropdownMenuItem onClick={() => setProofSale(sale)}>
              <EyeIcon />
              <span>{t("View payment proof")}</span>
            </DropdownMenuItem>
          )}
          {canConfirmPayment(sale) && (
            <DropdownMenuItem
              onClick={() => setPendingStatus({ sale, next: "confirmed" })}
            >
              <CheckCircle2Icon />
              <span>{t("Confirm payment")}</span>
            </DropdownMenuItem>
          )}
          {canRejectPayment(sale) && (
            <DropdownMenuItem
              onClick={() =>
                setPendingStatus({ sale, next: "payment_rejected" })
              }
            >
              <XCircleIcon />
              <span>{t("Reject payment")}</span>
            </DropdownMenuItem>
          )}
          {canMarkDelivered(sale) && (
            <DropdownMenuItem onClick={() => setPendingDeliveryId(sale.id)}>
              <PackageCheckIcon />
              <span>{t("Mark as delivered")}</span>
            </DropdownMenuItem>
          )}
          {canDelete(sale) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteId(sale.id)}
              >
                <TrashIcon />
                <span>{t("Delete")}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  function renderSaleCard(sale: Sale) {
    return (
      <Card key={sale.id} size="sm">
        <CardHeader>
          <CardTitle className="wrap-break-word">{sale.clientName}</CardTitle>
          <CardDescription className="font-mono text-xs">
            {sale.saleNumber}
          </CardDescription>
          <CardAction>{renderActions(sale)}</CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <div>
                {t("{{count}} item", { count: sale.items.length })} ·{" "}
                {sale.totalQty} {t("units")}
              </div>
              <div>
                {sale.soldBy.name} · {formatDate(sale.createdAt)}
              </div>
            </div>
            <div className="text-base font-semibold tabular-nums whitespace-nowrap">
              {formatAmount(sale.totalAmount, sale.currency)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {renderStatusBadge(sale.status)}
            {sale.delivered && (
              <Badge variant="outline">{t("Delivered")}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const header = (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("Sales")}</h2>
        <p className="text-muted-foreground">
          {t("Record sales drawn from one or more warehouses.")}
        </p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        {isAdmin && (
          <Select
            value={salesPersonFilter}
            onValueChange={handleSalesPersonFilterChange}
            items={{
              [SALES_PERSON_FILTER_ALL]: t("All sales people"),
              ...Object.fromEntries(salesPersons.map((s) => [s.id, s.name])),
            }}
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder={t("Filter by sales person")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SALES_PERSON_FILTER_ALL}>
                {t("All sales people")}
              </SelectItem>
              {salesPersons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isAdmin && filterSoldByUserId && (
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => setSummaryOpen(true)}
          >
            <ClipboardListIcon className="size-4" />
            {t("Dispatch summary")}
          </Button>
        )}
        <Button
          className="w-full md:w-auto"
          onClick={() => setFormOpen(true)}
        >
          <PlusIcon className="size-4" />
          {t("New sale")}
        </Button>
      </div>
    </div>
  )

  const selectedSalesPersonName = salesPersons.find(
    (s) => s.id === filterSoldByUserId,
  )?.name

  const summaryDialog = (
    <SalesDispatchSummaryDialog
      open={summaryOpen}
      onOpenChange={setSummaryOpen}
      soldByUserId={filterSoldByUserId ?? null}
      salesPersonName={selectedSalesPersonName}
    />
  )

  if (isLoading) {
    const skeletonCount = Math.min(pageSize, 5)
    return (
      <div className="space-y-4">
        {header}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Card key={i} size="sm">
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="hidden rounded-lg border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Sale #")}</TableHead>
                <TableHead>{t("Client")}</TableHead>
                <TableHead>{t("Items")}</TableHead>
                <TableHead>{t("Total")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Sold by")}</TableHead>
                <TableHead>{t("Date")}</TableHead>
                <TableHead className="w-36">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
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
      {sales.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {t("No sales found.")}
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {sales.map((sale: Sale) => renderSaleCard(sale))}
          </div>
          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Sale #")}</TableHead>
                  <TableHead>{t("Client")}</TableHead>
                  <TableHead>{t("Items")}</TableHead>
                  <TableHead>{t("Total")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead>{t("Sold by")}</TableHead>
                  <TableHead>{t("Date")}</TableHead>
                  <TableHead className="w-36">{t("Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale: Sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="align-top font-mono text-sm whitespace-nowrap">
                      {sale.saleNumber}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="wrap-break-word">{sale.clientName}</div>
                    </TableCell>
                    <TableCell>
                      {t("{{count}} item", { count: sale.items.length })}
                      <span className="text-muted-foreground">
                        {" "}
                        ({sale.totalQty} {t("units")})
                      </span>
                    </TableCell>
                    <TableCell className="align-top whitespace-nowrap">
                      {formatAmount(sale.totalAmount, sale.currency)}
                    </TableCell>
                    <TableCell>
                      {renderStatusBadge(sale.status)}
                      {sale.delivered && (
                        <Badge variant="outline" className="ml-1">
                          {t("Delivered")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{sale.soldBy.name}</TableCell>
                    <TableCell>{formatDate(sale.createdAt)}</TableCell>
                    <TableCell className="align-top">
                      {renderActions(sale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
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
      {summaryDialog}
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
      <AlertDialog
        open={pendingDeliveryId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeliveryId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Mark as delivered")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Mark this sale as delivered? This will hide it from the sales-person filter and cannot be undone.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeliveryConfirm}
              disabled={deliveryMutation.isPending}
            >
              {deliveryMutation.isPending ? t("Saving...") : t("Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
