import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import { fetchClientsApi, removeClientApi } from "@/lib/clients"
import {
  fetchSalesPersonOptionsApi,
  salesPersonOptionsQueryKey,
} from "@/lib/users"
import { useAuth } from "@/hooks/use-auth"
import type { Client } from "@base-dashboard/shared"
import { ClientFormDialog } from "@/components/client-form-dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataPagination } from "@/components/data-pagination"
import {
  AlertCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

const SALES_PERSON_FILTER_ALL = "__all__"

export default function ClientsPage() {
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
  const [editingClient, setEditingClient] = useState<Client | undefined>(
    undefined,
  )
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filterSalesPersonId =
    isAdmin && salesPersonFilter !== SALES_PERSON_FILTER_ALL
      ? salesPersonFilter
      : undefined

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["clients", page, pageSize, filterSalesPersonId ?? null],
    queryFn: () =>
      fetchClientsApi(page, pageSize, {
        salesPersonId: filterSalesPersonId,
      }),
    placeholderData: keepPreviousData,
  })

  const salesPersonsQuery = useQuery({
    queryKey: salesPersonOptionsQueryKey,
    queryFn: fetchSalesPersonOptionsApi,
    enabled: isAdmin,
  })

  const clients = data?.data ?? []
  const meta = data?.meta
  const salesPersons = salesPersonsQuery.data ?? []

  const deleteMutation = useMutation({
    mutationFn: removeClientApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      toast.success(t("Client deleted"))
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to delete client"))
    },
  })

  function handleAdd() {
    setEditingClient(undefined)
    setFormOpen(true)
  }

  function handleEdit(client: Client) {
    setEditingClient(client)
    setFormOpen(true)
  }

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

  function handleSalesPersonFilterChange(value: string | null) {
    setSalesPersonFilter(value ?? SALES_PERSON_FILTER_ALL)
    setPage(1)
  }

  const totalPages = meta?.totalPages ?? 1

  const heading = (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {isAdmin ? t("Clients") : t("My Clients")}
        </h2>
        <p className="text-muted-foreground">
          {isAdmin
            ? t("Manage clients across all sales people.")
            : t("Manage your own clients.")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Select
            value={salesPersonFilter}
            onValueChange={handleSalesPersonFilterChange}
          >
            <SelectTrigger className="w-56">
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
        <Button onClick={handleAdd}>
          <PlusIcon className="size-4" />
          {t("Add Client")}
        </Button>
      </div>
    </div>
  )

  const columnCount = isAdmin ? 6 : 5

  if (isLoading) {
    return (
      <div className="space-y-4">
        {heading}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("RIF")}</TableHead>
                <TableHead>{t("Address")}</TableHead>
                <TableHead>{t("Phone")}</TableHead>
                {isAdmin && <TableHead>{t("Sales Person")}</TableHead>}
                <TableHead className="w-32">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnCount }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
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
            {t(error.message) || t("Failed to load clients.")}
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
              <TableHead>{t("RIF")}</TableHead>
              <TableHead>{t("Address")}</TableHead>
              <TableHead>{t("Phone")}</TableHead>
              {isAdmin && <TableHead>{t("Sales Person")}</TableHead>}
              <TableHead className="w-32">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <UsersIcon className="size-8 opacity-50" />
                    <p>{t("No clients found.")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-sm">{c.rif}</TableCell>
                  <TableCell>{c.address}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      {c.salesPersonName ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(c)}
                      >
                        <PencilIcon className="size-4" />
                        <span className="sr-only">{t("Edit")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(c.id)}
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
          totalLabel={t("{{count}} client total", { count: meta.total })}
          rowsId="rows-per-page-clients"
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete client")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This action cannot be undone. This will permanently delete the client.",
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
      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editingClient}
      />
    </div>
  )
}
