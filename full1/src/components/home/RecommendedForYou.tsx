import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Star, Wand2 } from 'lucide-react'
import { recommendationsApi, type Recommendation } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Skeleton } from '@/components/ui/Skeleton'
import { SmartImage } from '@/components/ui/SmartImage'

export function RecommendedForYou() {
  const { user } = useAuth()
  const [items, setItems] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    recommendationsApi
      .list(8)
      .then((res) => {
        if (active) setItems(res.data)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6" aria-label="Recommended for you">
        <div className="mb-8 flex flex-col items-start justify-between gap-2 md:flex-row md:items-end">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
              <Skeleton className="h-44 w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6" aria-label="Recommended for you">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-8 flex flex-wrap items-end justify-between gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            {user ? 'Personalised for you' : 'Hand-picked for you'}
          </span>
          <h2 className="font-serif text-3xl font-bold text-balance text-foreground md:text-4xl">
            Recommended for you
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
            Based on your wishlist, bookings and the season, Triplora's engine picks your next escape.
          </p>
        </div>
        <Link
          to="/explore"
          className="flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          Explore all
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <motion.div
            key={item.destination.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: 'easeOut' }}
            className="group flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border transition-shadow hover:shadow-lg"
          >
            <Link
              to={`/destinations/${item.destination.id}`}
              className="relative block h-48 overflow-hidden"
            >
              <SmartImage
                src={item.destination.image}
                alt={item.destination.name}
                className="h-48 [&_img]:transition-transform [&_img]:duration-700 [&_img]:group-hover:scale-105"
              />
              <span className="glass absolute top-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Match {Math.round(item.score * 100)}%
              </span>
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-lg font-bold text-card-foreground">
                  <Link to={`/destinations/${item.destination.id}`} className="hover:text-primary">
                    {item.destination.name}
                  </Link>
                </h3>
                <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden="true" />
                  {item.destination.rating}
                </span>
              </div>
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {item.reasons.slice(0, 2).join(' · ')}
              </p>
              <Link
                to={`/destinations/${item.destination.id}`}
                className="mt-auto inline-flex w-fit items-center gap-1 pt-1 text-sm font-semibold text-primary hover:underline"
              >
                View
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
