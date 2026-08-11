import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  LogOut,
  User,
  CalendarDays,
  Heart,
  KeyRound,
  Edit3,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Mail,
  Bell,
  CalendarClock,
  Sparkles,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useWishlist } from '@/context/WishlistContext'
import { useToast } from '@/context/ToastContext'
import { authApi, bookingApi, type BookingResult, type EmailPreferences } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

export function ProfilePage() {
  const { user, logout, updateProfile, changePassword } = useAuth()
  const { wishlist } = useWishlist()
  const toast = useToast()
  const navigate = useNavigate()

  const [bookings, setBookings] = useState<BookingResult[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)

  // Email preferences state
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null)
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Edit Profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [avatar, setAvatar] = useState(user?.avatar ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Change Password state
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    bookingApi
      .list()
      .then((res) => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoadingBookings(false))
  }, [])

  useEffect(() => {
    authApi
      .getEmailPreferences()
      .then((res) => setPrefs(res.data))
      .catch(() => {})
      .finally(() => setLoadingPrefs(false))
  }, [])

  const handleTogglePref = async (key: keyof EmailPreferences, value: boolean) => {
    if (!prefs) return
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSavingPrefs(true)
    try {
      const res = await authApi.updateEmailPreferences({ [key]: value })
      setPrefs(res.data)
      toast.success('Email preferences updated')
    } catch (err) {
      setPrefs(prefs)
      toast.error(err instanceof Error ? err.message : 'Failed to update email preferences')
    } finally {
      setSavingPrefs(false)
    }
  }

  if (!user) return null

  const activeBookingsCount = bookings.filter(
    (b) => b.status === 'PENDING' || b.status === 'CONFIRMED',
  ).length
  const completedBookingsCount = bookings.filter((b) => b.status === 'COMPLETED').length

  const handleLogout = async () => {
    await logout()
    toast.info('Logged out successfully')
    navigate('/')
  }

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await updateProfile({
        name: name.trim(),
        avatar: avatar.trim() || null,
      })
      toast.success('Profile updated successfully')
      setIsEditingProfile(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      await changePassword(oldPassword, newPassword)
      toast.success('Password changed successfully')
      setIsChangingPassword(false)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change password'
      setPasswordError(msg)
      toast.error(msg)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col gap-8"
      >
        {/* User Card */}
        <div className="glass-strong flex flex-col items-center gap-5 rounded-2xl p-6 text-center shadow-sm ring-1 ring-border md:flex-row md:text-left md:p-8">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10" aria-hidden="true" />
            )}
          </div>

          <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <h1 className="font-serif text-2xl font-bold text-foreground">{user.name}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <ShieldCheck className="h-3 w-3" />
                {user.role}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              Member since{' '}
              {new Date(user.createdAt).toLocaleDateString('en-IN', {
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setName(user.name)
                setAvatar(user.avatar ?? '')
                setIsEditingProfile(!isEditingProfile)
                setIsChangingPassword(false)
              }}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Profile
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsChangingPassword(!isChangingPassword)
                setIsEditingProfile(false)
              }}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Password
            </Button>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40">
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </Button>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditingProfile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
          >
            <h2 className="font-serif text-lg font-bold text-card-foreground mb-4">Edit Profile</h2>
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-name" className="text-sm font-medium text-foreground">
                  Full Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-avatar" className="text-sm font-medium text-foreground">
                  Avatar Image URL <span className="text-xs text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="profile-avatar"
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditingProfile(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Change Password Form */}
        {isChangingPassword && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
          >
            <h2 className="font-serif text-lg font-bold text-card-foreground mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              {passwordError && (
                <p className="text-sm text-red-500 rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                  {passwordError}
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="old-password" className="text-sm font-medium text-foreground">
                  Current Password
                </label>
                <input
                  id="old-password"
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsChangingPassword(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Email Preferences */}
        <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
          <h2 className="mb-1 font-serif text-lg font-bold text-card-foreground">Email Preferences</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Choose which emails you want to receive from Triplora.
          </p>

          {loadingPrefs ? (
            <p className="text-sm text-muted-foreground">Loading preferences...</p>
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {(
                [
                  {
                    key: 'bookingEmails',
                    label: 'Booking Emails',
                    description: 'Booking confirmations, payment receipts and cancellation updates',
                    icon: Mail,
                  },
                  {
                    key: 'marketingEmails',
                    label: 'Marketing Emails',
                    description: 'Offers, new destinations and seasonal inspiration',
                    icon: Bell,
                  },
                  {
                    key: 'aiPlannerEmails',
                    label: 'AI Planner Emails',
                    description: 'Notifications when you save an AI-generated itinerary',
                    icon: Sparkles,
                  },
                  {
                    key: 'tripReminderEmails',
                    label: 'Trip Reminder Emails',
                    description: 'A 24-hour reminder before your trip with weather and packing tips',
                    icon: CalendarClock,
                  },
                ] as const
              ).map(({ key, label, description, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs?.[key] ?? true}
                    aria-label={label}
                    disabled={savingPrefs}
                    onClick={() => handleTogglePref(key, !(prefs?.[key] ?? true))}
                    className={cn(
                      'relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60',
                      prefs?.[key] ?? true ? 'bg-primary' : 'bg-muted-foreground/30',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        (prefs?.[key] ?? true) && 'translate-x-5',
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/my-bookings"
            className="press glass card-lift flex items-center gap-4 rounded-2xl p-5 shadow-sm ring-1 ring-border"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {loadingBookings ? <Skeleton className="h-7 w-10" /> : bookings.length}
              </p>
              <p className="text-xs font-medium text-muted-foreground">Total Bookings</p>
            </div>
          </Link>

          <Link
            to="/my-bookings"
            className="press glass card-lift flex items-center gap-4 rounded-2xl p-5 shadow-sm ring-1 ring-border"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {loadingBookings ? <Skeleton className="h-7 w-10" /> : activeBookingsCount}
              </p>
              <p className="text-xs font-medium text-muted-foreground">Active Bookings</p>
            </div>
          </Link>

          <Link
            to="/my-bookings"
            className="press glass card-lift flex items-center gap-4 rounded-2xl p-5 shadow-sm ring-1 ring-border"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {loadingBookings ? <Skeleton className="h-7 w-10" /> : completedBookingsCount}
              </p>
              <p className="text-xs font-medium text-muted-foreground">Completed Trips</p>
            </div>
          </Link>

          <Link
            to="/wishlist"
            className="press glass card-lift flex items-center gap-4 rounded-2xl p-5 shadow-sm ring-1 ring-border"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <Heart className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">{wishlist.length}</p>
              <p className="text-xs font-medium text-muted-foreground">Wishlist Items</p>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
