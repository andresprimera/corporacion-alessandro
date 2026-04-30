import { useEffect, useState } from "react"
import { AddUserDialog } from "@/components/add-user-dialog"
import { useTranslation } from "react-i18next"
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchUsersApi,
  updateUserRoleApi,
  updateUserStatusApi,
  updateUserCityApi,
  updateUserCommissionApi,
  removeUserApi,
} from "@/lib/users"
import { fetchCityOptionsApi } from "@/lib/cities"
import type { User } from "@base-dashboard/shared"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { DataPagination } from "@/components/data-pagination"
import {
  AlertCircleIcon,
  TrashIcon,
  PlusIcon,
} from "lucide-react"
import { toast } from "sonner"

function roleLabel(role: string, t: (key: string) => string): string {
  if (role === "admin") return t("Admin")
  if (role === "salesPerson") return t("Sales Person")
  return t("User")
}

function CommissionInput({
  value,
  disabled,
  onCommit,
}: {
  value: number
  disabled: boolean
  onCommit: (next: number) => void
}) {
  const [local, setLocal] = useState(String(value))

  useEffect(() => {
    setLocal(String(value))
  }, [value])

  function commit() {
    const parsed = Number(local)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setLocal(String(value))
      return
    }
    if (parsed === value) return
    onCommit(parsed)
  }

  return (
    <Input
      type="number"
      min={0}
      max={100}
      step={0.01}
      value={local}
      disabled={disabled}
      className="w-20"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur()
        } else if (e.key === "Escape") {
          setLocal(String(value))
          e.currentTarget.blur()
        }
      }}
    />
  )
}

export default function UsersPage() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["users", page, pageSize],
    queryFn: () => fetchUsersApi(page, pageSize),
    placeholderData: keepPreviousData,
  })

  const { data: cityOptions = [] } = useQuery({
    queryKey: ["cities", "options"],
    queryFn: fetchCityOptionsApi,
  })

  const users = data?.data ?? []
  const meta = data?.meta

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUserRoleApi(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success(t("Role updated"))
    },
    onError: (error: Error) => {
      toast.error(t(error.message) || t("Failed to update role"))
    },
  })

  const approveMutation = useMutation({
    mutationFn: (userId: string) => updateUserStatusApi(userId, "approved"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success(t("User approved"))
    },
    onError: (error: Error) => {
      toast.error(t(error.message) || t("Failed to update status"))
    },
  })

  const updateCityMutation = useMutation({
    mutationFn: ({ userId, cityId }: { userId: string; cityId: string }) =>
      updateUserCityApi(userId, cityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success(t("City updated"))
    },
    onError: (error: Error) => {
      toast.error(t(error.message) || t("Failed to update city"))
    },
  })

  const updateCommissionMutation = useMutation({
    mutationFn: ({
      userId,
      commissionPercentage,
    }: {
      userId: string
      commissionPercentage: number
    }) => updateUserCommissionApi(userId, commissionPercentage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success(t("Commission updated"))
    },
    onError: (error: Error) => {
      toast.error(t(error.message) || t("Failed to update commission"))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => removeUserApi(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success(t("User deleted"))
    },
    onError: (error: Error) => {
      toast.error(t(error.message) || t("Failed to delete user"))
    },
  })

  function handleRoleChange(userId: string, role: string) {
    updateRoleMutation.mutate({ userId, role })
  }

  function handleCityChange(userId: string, cityId: string) {
    updateCityMutation.mutate({ userId, cityId })
  }

  function handleDelete() {
    if (!deleteUserId) return
    deleteMutation.mutate(deleteUserId, {
      onSettled: () => setDeleteUserId(null),
    })
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  const totalPages = meta?.totalPages ?? 1

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("Users")}</h2>
            <p className="text-muted-foreground">
              {t("Manage user accounts and roles.")}
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <PlusIcon className="size-4" />
            {t("Add User")}
          </Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Email")}</TableHead>
                <TableHead>{t("Role")}</TableHead>
                <TableHead>{t("City")}</TableHead>
                <TableHead>{t("Commission %")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead className="w-25">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: Math.min(pageSize, 5) }).map(
                (_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("Users")}</h2>
            <p className="text-muted-foreground">
              {t("Manage user accounts and roles.")}
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <PlusIcon className="size-4" />
            {t("Add User")}
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircleIcon className="size-10 text-destructive" />
          <p className="text-muted-foreground">
            {t(error.message) || t("Failed to load users.")}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("Users")}</h2>
          <p className="text-muted-foreground">
            {t("Manage user accounts and roles.")}
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <PlusIcon className="size-4" />
          {t("Add User")}
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Email")}</TableHead>
              <TableHead>{t("Role")}</TableHead>
              <TableHead>{t("City")}</TableHead>
              <TableHead>{t("Commission %")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead className="w-25">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t("No users found.")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u: User) => {
                const isSelf = u.id === currentUser?.id
                const isSalesPerson = u.role === "salesPerson"
                const isPending = isSalesPerson && u.status === "in_revision"
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge variant="secondary">{roleLabel(u.role, t)}</Badge>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(val) =>
                            val && handleRoleChange(u.id, val)
                          }
                        >
                          <SelectTrigger size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{t("Admin")}</SelectItem>
                            <SelectItem value="user">{t("User")}</SelectItem>
                            <SelectItem value="salesPerson">
                              {t("Sales Person")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {isSalesPerson ? (
                        <Select
                          value={u.cityId ?? ""}
                          onValueChange={(val) =>
                            val && handleCityChange(u.id, val)
                          }
                          disabled={isSelf}
                        >
                          <SelectTrigger size="sm">
                            <SelectValue placeholder={t("Select a city")} />
                          </SelectTrigger>
                          <SelectContent>
                            {cityOptions.map((city) => (
                              <SelectItem key={city.id} value={city.id}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isSalesPerson ? (
                        <CommissionInput
                          value={u.commissionPercentage ?? 3}
                          disabled={isSelf || updateCommissionMutation.isPending}
                          onCommit={(commissionPercentage) =>
                            updateCommissionMutation.mutate({
                              userId: u.id,
                              commissionPercentage,
                            })
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{t("In revision")}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              isSelf || approveMutation.isPending
                            }
                            onClick={() => approveMutation.mutate(u.id)}
                          >
                            {t("Approve")}
                          </Button>
                        </div>
                      ) : isSalesPerson && u.status === "approved" ? (
                        <Badge variant="secondary">{t("Approved")}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isSelf}
                        onClick={() => setDeleteUserId(u.id)}
                      >
                        <TrashIcon className="size-4" />
                        <span className="sr-only">{t("Delete")}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      {meta && (
        <DataPagination
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalLabel={t("{{count}} user total", { count: meta.total })}
          rowsId="rows-per-page"
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      <AlertDialog
        open={deleteUserId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteUserId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete user")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This action cannot be undone. This will permanently delete the user account.")}
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
      <AddUserDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  )
}
