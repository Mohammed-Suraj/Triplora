import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Compass, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 pt-28 pb-20 text-center md:px-6">
      <img
        src="/images/wayanad.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <motion.span
          initial={{ rotate: -12, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="glass flex h-20 w-20 items-center justify-center rounded-full text-primary"
        >
          <Compass className="h-10 w-10" aria-hidden="true" />
        </motion.span>

        <h1 className="font-serif text-7xl font-bold text-foreground md:text-8xl">404</h1>

        <div className="flex flex-col items-center gap-2">
          <h2 className="max-w-lg font-serif text-2xl font-semibold text-balance text-foreground md:text-3xl">
            You&apos;ve wandered off the trail
          </h2>
          <p className="flex items-center gap-1.5 text-base leading-relaxed text-pretty text-muted-foreground">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            This page doesn&apos;t exist on our map of Kerala.
          </p>
        </div>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link to="/">
            <Button size="lg">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Button>
          </Link>
          <Link to="/explore">
            <Button size="lg" variant="outline">
              Explore destinations
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
