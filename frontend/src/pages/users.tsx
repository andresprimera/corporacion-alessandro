import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { fetchUsersApi, updateUserRoleApi, deleteUserApi } from "@/lib/auth"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrashIcon } from "lucide-react"
import { toast } from "sonner"

export default function UsersPage() {
  const { user: currentUser, getAccessToken } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    try {
      const data = await fetchUsersApi(token)
      setUsers(data)
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function handleRoleChange(userId: string, role: string) {
    const token = getAccessToken()
    if (!token) return
    try {
      const updated = await updateUserRoleApi(token, userId, role)
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      )
      toast.success("Role updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role",
      )
    }
  }

  async function handleDelete(userId: string) {
    const token = getAccessToken()
    if (!token) return
    try {
      await deleteUserApi(token, userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast.success("User deleted")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete user",
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">
          Manage user accounts and roles.
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {isSelf ? (
                      <Badge variant="secondary">{u.role}</Badge>
                    ) : (
                      <Select
                        value={u.role}
                        onValueChange={(val) => val && handleRoleChange(u.id, val)}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">admin</SelectItem>
                          <SelectItem value="user">user</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isSelf}
                      onClick={() => handleDelete(u.id)}
                    >
                      <TrashIcon className="size-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
