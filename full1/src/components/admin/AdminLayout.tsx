import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  LayoutDashboard,
  Users,
  MapPin,
  CalendarDays,
  Star,
  Flag,
  BarChart3,
  MessageSquare,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/destinations', label: 'Destinations', icon: MapPin },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/review-reports', label: 'Review Reports', icon: Flag },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/contact-messages', label: 'Contact Messages', icon: MessageSquare },
  { to: '/admin/email-logs', label: 'Email Logs', icon: Mail },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.info('Logged out successfully')
    navigate('/admin/login', { replace: true })
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <Link
        to="/"
        className="flex items-center gap-2 px-5 py-5 font-serif text-lg font-bold text-foreground"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </span>
        Triplora Admin
      </Link>

      <nav aria-label="Admin navigation" className="flex flex-1 flex-col gap-1 px-3 pb-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="admin-nav-active"
                    className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    aria-hidden="true"
                  />
                )}
                <item.icon className="h-4.5 w-4.5" aria-hidden="true" />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-card/50 md:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-xl md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-strong sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border px-4 md:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle admin menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary md:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>

          <div className="hidden text-sm text-muted-foreground md:block">
            {navItems.find((item) => location.pathname.startsWith(item.to))?.label ?? 'Admin'}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase() ?? 'A'}
                  </span>
                )}
              </span>
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-semibold text-foreground">{user?.name}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </div>
            <Link
              to="/profile"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
