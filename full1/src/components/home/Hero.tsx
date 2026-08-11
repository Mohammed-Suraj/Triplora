import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, MapPin, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SmartImage } from '@/components/ui/SmartImage'
import { destinationsApi } from '@/lib/api'

export function Hero() {
  const [totalDestinations, setTotalDestinations] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    destinationsApi
      .list({ limit: '1' })
      .then((res) => {
        if (active && typeof res.meta?.total === 'number') {
          setTotalDestinations(res.meta.total)
        }
      })
      .catch(() => {
        // fall back to the static count
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden">
      <SmartImage
        src="/images/hero-kerala.png"
        alt="Houseboat drifting through the Kerala backwaters at golden hour"
        loading="eager"
        className="absolute inset-0 h-full w-full"
        skeletonClassName="rounded-none"
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 pt-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {"God's Own Country"}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="font-serif text-4xl font-bold text-balance text-white md:text-6xl lg:text-7xl"
        >
          Discover the Soul of Kerala
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          className="max-w-2xl text-base leading-relaxed text-pretty text-white/85 md:text-lg"
        >
          From misty tea hills of Munnar to the tranquil backwaters of Alleppey — curated
          journeys through India&apos;s most enchanting landscapes, designed around you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link to="/explore">
            <Button size="lg">
              Explore Destinations
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link to="/planner">
            <Button size="lg" variant="glass" className="text-white">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Plan with AI
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-8 flex items-center gap-8 md:gap-12"
        >
          {[
            { value: totalDestinations ? `${totalDestinations}+` : '9+', label: 'Destinations' },
            { value: '15k+', label: 'Happy Travellers' },
            { value: '4.8', label: 'Average Rating' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="font-serif text-2xl font-bold text-white md:text-3xl">
                {stat.value}
              </span>
              <span className="text-xs text-white/70 md:text-sm">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
