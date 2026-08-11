import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Mail, Globe, User, KeyRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export function SettingsPage() {
  const { user, updateProfile, changePassword } = useAuth()
  const toast = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [avatar, setAvatar] = useState(user?.avatar ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const inputClass =
    'h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  const handleProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await updateProfile({ name: name.trim(), avatar: avatar.trim() || null })
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePassword = async (e: FormEvent) => {
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
    <div>
      <AdminPageHeader title="Settings" subtitle="Administrator account settings" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex max-w-xl flex-col gap-6"
      >
        {/* Account info */}
        <div className="glass-strong flex items-center gap-4 rounded-2xl p-6 shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-serif text-xl font-bold text-foreground">{user?.name ?? 'Administrator'}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700/50">
                {user?.role ?? 'ADMIN'}
              </Badge>
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" aria-hidden="true" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" aria-hidden="true" />
                {import.meta.env.DEV ? 'Development' : 'Production'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit profile */}
        <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-card-foreground">
            <User className="h-4 w-4 text-primary" aria-hidden="true" />
            Profile
          </h2>
          <form onSubmit={handleProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-name" className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <input id="settings-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-avatar" className="text-sm font-medium text-foreground">
                Avatar URL <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <input id="settings-avatar" type="url" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://example.com/avatar.jpg" className={inputClass} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </div>

        {/* Change password */}
        <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-card-foreground">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
            Change Password
          </h2>
          <form onSubmit={handlePassword} className="flex flex-col gap-4">
            {passwordError && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300"
              >
                {passwordError}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-old" className="text-sm font-medium text-foreground">
                Current Password
              </label>
              <input id="settings-old" type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-new" className="text-sm font-medium text-foreground">
                  New Password
                </label>
                <input id="settings-new" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-confirm" className="text-sm font-medium text-foreground">
                  Confirm New Password
                </label>
                <input id="settings-confirm" type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={savingPassword}>
                {savingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}