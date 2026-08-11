import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronRight, Compass, Heart, Menu, Moon, Route, Sparkles, Sun, User, X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useWishlist } from '@/context/WishlistContext'
import { useAuth } from '@/context/AuthContext'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/planner', label: 'Trip Planner' },
  { to: '/ai-assistant', label: 'AI Assistant', sparkle: true },
  { to: '/compare', label: 'Compare' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
  const { wishlist } = useWishlist()
  const { user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const transparent = !scrolled && !mobileOpen

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        transparent ? 'bg-transparent' : 'glass-strong shadow-md shadow-black/5',
      )}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-18 md:px-6"
      >
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2 font-serif text-xl font-bold text-foreground"
          aria-label="Triplora home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/30 transition-transform duration-300 group-hover:rotate-12">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden min-[400px]:inline">Triplora</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map(({ to, label, sparkle }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full bg-secondary shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center">
                    {label}
                    {sparkle && (
                      <Sparkles className="ml-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    )}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="press flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Moon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <NotificationBell />
          <Link
            to="/wishlist"
            aria-label={`Wishlist, ${wishlist.length} saved`}
            className="press relative flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Heart className="h-5 w-5" aria-hidden="true" />
            {wishlist.length > 0 && (
              <motion.span
                key={wishlist.length}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-0.5 right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm"
              >
                {wishlist.length > 99 ? '99+' : wishlist.length}
              </motion.span>
            )}
          </Link>
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                onMouseEnter={() => setUserMenuOpen(true)}
                aria-label="User menu"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className={cn(
                  'press flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border/60 bg-card/60 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  userMenuOpen && 'bg-secondary',
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden="true">
                  {user.name?.charAt(0).toUpperCase() ?? 'U'}
                </span>
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    onMouseEnter={() => setUserMenuOpen(true)}
                    onMouseLeave={() => setUserMenuOpen(false)}
                    role="menu"
                    className="absolute top-full right-0 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10"
                  >
                    <div className="border-b border-border bg-secondary/40 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex flex-col p-1.5">
                      {[
                        { to: '/my-bookings', icon: CalendarDays, label: 'My Bookings' },
                        { to: '/my-ai-trips', icon: Route, label: 'My AI Trips' },
                        { to: '/profile', icon: User, label: 'My Profile' },
                      ].map(({ to, icon: Icon, label }) => (
                        <Link
                          key={to}
                          to={to}
                          role="menuitem"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <span className="flex-1">{label}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                to="/login"
                className="press rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
              >
                Sign up
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="press flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
          >
            <motion.span key={mobileOpen ? 'x' : 'menu'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.18 }}>
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </motion.span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border lg:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map(({ to, label, sparkle }, i) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                >
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-secondary',
                      )
                    }
                  >
                    <span className="inline-flex items-center">
                      {label}
                      {sparkle && (
                        <Sparkles className="ml-1.5 inline h-4 w-4 text-primary" aria-hidden="true" />
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
                  </NavLink>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.03, duration: 0.2 }}
                className="mt-2 flex flex-col gap-2 border-t border-border pt-4"
              >
                {user ? (
                  <NavLink
                    to="/profile"
                    className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary/80"
                  >
                    My Profile
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
                  </NavLink>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      className="rounded-full border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
