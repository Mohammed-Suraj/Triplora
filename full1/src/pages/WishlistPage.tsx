import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, HeartOff } from 'lucide-react'
import { useWishlist } from '@/context/WishlistContext'
import { DestinationCard } from '@/components/DestinationCard'
import { DestinationGridSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

export function WishlistPage() {
  const { wishlistDestinations: saved, loading } = useWishlist()

  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Your Wishlist
        </span>
        <h1 className="max-w-2xl font-serif text-4xl font-bold text-balance text-foreground md:text-5xl">
          Places you&apos;re dreaming of
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
          {saved.length > 0
            ? `You have ${saved.length} ${saved.length === 1 ? 'destination' : 'destinations'} saved. Ready to turn them into a journey?`
            : 'Tap the heart on any destination to save it here for later.'}
        </p>
      </motion.div>

      {loading ? (
        <div className="mt-12">
          <DestinationGridSkeleton count={3} />
        </div>
      ) : saved.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((destination, index) => (
            <DestinationCard key={destination.id} destination={destination} index={index} />
          ))}
        </div>
      ) : (
        <div className="mt-12">
          <EmptyState
            icon={HeartOff}
            title="Your wishlist is empty"
            message="Start exploring Kerala's hills, backwaters and beaches — save the ones that catch your eye and they'll appear right here."
          >
            <Link to="/explore">
              <Button size="lg">
                Explore destinations
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </EmptyState>
        </div>
      )}
    </div>
  )
}
