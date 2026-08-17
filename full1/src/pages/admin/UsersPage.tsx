import { useEffect, useState } from 'react'
import { Users as UsersIcon, Trash2, ShieldCheck } from 'lucide-react'
import { adminApi, type AdminUser } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchUsers = () => {
    setLoading(true)
    setError(null)
    adminApi
      .users({ limit: 50 })
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = async (user: AdminUser, role: 'USER' | 'ADMIN') => {
    if (role === user.role) return
    setBusyId(user.id)
    try {
      await adminApi.updateUserRole(user.id, role)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)))
      toast.success(`${user.name} is now ${role}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user role')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`Delete user "${user.name}" (${user.email})? This will remove all of their data.`)) return
    setBusyId(user.id)
    try {
      await adminApi.deleteUser(user.id)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      toast.success('User deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setBusyId(null)
    }
  }

  const isSelf = (user: AdminUser) => currentUser?.id === user.id

  return (
    <div>
      <AdminPageHeader title="Users" subtitle={`${users.length} registered account${users.length === 1 ? '' : 's'}`} />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchUsers} />
      ) : users.length === 0 ? (
        <AdminEmptyState icon={<UsersIcon className="h-6 w-6" aria-hidden="true" />} title="No users yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-4 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                  {user.name}
                  {isSelf(user) && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email} · joined{' '}
                  {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="hidden shrink-0 gap-4 text-xs text-muted-foreground sm:flex">
                <span>{user._count.bookings} bookings</span>
                <span>{user._count.reviews} reviews</span>
                <span>{user._count.wishlists} saved</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  className={
                    user.role === 'ADMIN'
                      ? 'border bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700/50'
                      : ''
                  }
                >
                  {user.role}
                </Badge>
                <select
                  aria-label={`Change role for ${user.name}`}
                  value={user.role}
                  disabled={busyId === user.id || isSelf(user)}
                  onChange={(e) => handleRoleChange(user, e.target.value as 'USER' | 'ADMIN')}
                  title={isSelf(user) ? 'You cannot change your own role' : 'Change role'}
                  className="h-9 w-28 rounded-full border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === user.id || isSelf(user)}
                  onClick={() => handleDelete(user)}
                  title={isSelf(user) ? 'You cannot delete your own account' : 'Delete user'}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete {user.name}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        You cannot change your own role or delete your own account.
      </p>
    </div>
  )
}