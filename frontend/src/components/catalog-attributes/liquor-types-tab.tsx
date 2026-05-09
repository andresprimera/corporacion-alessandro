import { useState } from "react"
import { LiquorTypeFormDialog } from "@/components/liquor-type-form-dialog"
import { useTranslation } from "react-i18next"
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import {
  fetchLiquorTypesApi,
  removeLiquorTypeApi,
} from "@/lib/liquor-types"
import type { LiquorType } from "@base-dashboard/shared"
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
  TrashIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { toast } from "sonner"

export function LiquorTypesTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [formOpen, setFormOpen] = useState(false)
  const [editingLiquorType, setEditingLiquorType] = useState<
    LiquorType | undefined
  >(undefined)
  const [deleteLiquorTypeId, setDeleteLiquorTypeId] = useState<string | null>(
    null,
  )

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["liquor-types", page, pageSize],
    queryFn: () => fetchLiquorTypesApi(page, pageSize),
    placeholderData: keepPreviousData,
  })

  const liquorTypes = data?.data ?? []
  const meta = data?.meta

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeLiquorTypeApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liquor-types"] })
      toast.success(t("Liquor type deleted"))
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to delete liquor type"))
    },
  })

  function handleAdd() {
    setEditingLiquorType(undefined)
    setFormOpen(true)
  }

  function handleEdit(liquorType: LiquorType) {
    setEditingLiquorType(liquorType)
    setFormOpen(true)
  }

  function handleDelete() {
    if (!deleteLiquorTypeId) return
    deleteMutation.mutate(deleteLiquorTypeId, {
      onSettled: () => setDeleteLiquorTypeId(null),
    })
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  const totalPages = meta?.totalPages ?? 1

  const toolbar = (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm">
        {t("Manage liquor types (e.g. rum, whisky) used by liquor products.")}
      </p>
      <Button onClick={handleAdd}>
        <PlusIcon className="size-4" />
        {t("Add Liquor Type")}
      </Button>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {toolbar}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Abbreviation")}</TableHead>
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
                    <Skeleton className="h-4 w-12" />
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
        {toolbar}
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircleIcon className="size-10 text-destructive" />
          <p className="text-muted-foreground">
            {t(error.message) || t("Failed to load liquor types.")}
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
      {toolbar}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Abbreviation")}</TableHead>
              <TableHead className="w-32">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liquorTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  {t("No liquor types found.")}
                </TableCell>
              </TableRow>
            ) : (
              liquorTypes.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.abbreviation}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(l)}
                      >
                        <PencilIcon className="size-4" />
                        <span className="sr-only">{t("Edit")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteLiquorTypeId(l.id)}
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
          totalLabel={t("{{count}} liquor type total", { count: meta.total })}
          rowsId="rows-per-page-liquor-types"
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      <AlertDialog
        open={deleteLiquorTypeId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteLiquorTypeId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete liquor type")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This action cannot be undone. Products using this liquor type must be reassigned first.",
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
      <LiquorTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        liquorType={editingLiquorType}
      />
    </div>
  )
}
