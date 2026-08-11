import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldX, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 pb-20 text-center md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex w-full flex-col items-center gap-4 rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <ShieldX className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-serif text-2xl font-bold text-card-foreground">403 — Access Denied</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You do not have permission to view this page. This area is restricted to administrators.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
