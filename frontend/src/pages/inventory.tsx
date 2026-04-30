import { useState } from "react"
import { InventoryFormDialog } from "@/components/inventory-form-dialog"
import { useTranslation } from "react-i18next"
import { i18n } from "@/lib/i18n"
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import {
  fetchInventoryTransactionsApi,
  removeInventoryTransactionApi,
  transactionTypeLabelKey,
} from "@/lib/inventory"
import type {
  InventoryTransaction,
  TransactionType,
} from "@base-dashboard/shared"
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

function transactionTypeBadgeVariant(
  value: TransactionType,
): "default" | "secondary" | "destructive" | "outline" {
  if (value === "inbound") return "default"
  if (value === "outbound") return "destructive"
  return "secondary"
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(i18n.language)
}

export default function InventoryPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<
    InventoryTransaction | undefined
  >(undefined)
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(
    null,
  )

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["inventory", "transactions", page, pageSize],
    queryFn: () => fetchInventoryTransactionsApi(page, pageSize),
    placeholderData: keepPreviousData,
  })

  const transactions = data?.data ?? []
  const meta = data?.meta

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeInventoryTransactionApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      toast.success(t("Transaction deleted"))
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to delete transaction"))
    },
  })

  function handleAdd() {
    setEditingTransaction(undefined)
    setFormOpen(true)
  }

  function handleEdit(tx: InventoryTransaction) {
    setEditingTransaction(tx)
    setFormOpen(true)
  }

  function handleDelete() {
    if (!deleteTransactionId) return
    deleteMutation.mutate(deleteTransactionId, {
      onSettled: () => setDeleteTransactionId(null),
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
        <h2 className="text-2xl font-bold tracking-tight">{t("Inventory")}</h2>
        <p className="text-muted-foreground">
          {t("Manage stock movements.")}
        </p>
      </div>
      <Button onClick={handleAdd}>
        <PlusIcon className="size-4" />
        {t("Add Transaction")}
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
                <TableHead>{t("Product")}</TableHead>
                <TableHead>{t("Warehouse")}</TableHead>
                <TableHead>{t("Type")}</TableHead>
                <TableHead>{t("Batch")}</TableHead>
                <TableHead>{t("Qty")}</TableHead>
                <TableHead>{t("Created by")}</TableHead>
                <TableHead>{t("Date")}</TableHead>
                <TableHead className="w-32">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="size-8" />
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
        {heading}
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircleIcon className="size-10 text-destructive" />
          <p className="text-muted-foreground">
            {t(error.message) || t("Failed to load transactions.")}
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
              <TableHead>{t("Product")}</TableHead>
              <TableHead>{t("Warehouse")}</TableHead>
              <TableHead>{t("Type")}</TableHead>
              <TableHead>{t("Batch")}</TableHead>
              <TableHead>{t("Qty")}</TableHead>
              <TableHead>{t("Created by")}</TableHead>
              <TableHead>{t("Date")}</TableHead>
              <TableHead className="w-32">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {t("No transactions found.")}
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {tx.productName ?? tx.productId}
                  </TableCell>
                  <TableCell>
                    {tx.warehouseName ?? tx.warehouseId}
                  </TableCell>
                  <TableCell>
                    <Badge variant={transactionTypeBadgeVariant(tx.transactionType)}>
                      {t(transactionTypeLabelKey(tx.transactionType))}
                    </Badge>
                  </TableCell>
                  <TableCell>{tx.batch}</TableCell>
                  <TableCell>{tx.qty}</TableCell>
                  <TableCell>{tx.createdBy.name}</TableCell>
                  <TableCell>{formatDate(tx.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(tx)}
                      >
                        <PencilIcon className="size-4" />
                        <span className="sr-only">{t("Edit")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTransactionId(tx.id)}
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
          totalLabel={t("{{count}} transaction total", { count: meta.total })}
          rowsId="rows-per-page-inventory"
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      <AlertDialog
        open={deleteTransactionId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTransactionId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete transaction")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This action cannot be undone. This will permanently delete the transaction.",
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
      <InventoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editingTransaction}
      />
    </div>
  )
}
