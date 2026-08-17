import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarPlus,
  Clock,
  Heart,
  IndianRupee,
  MapPin,
  Mountain,
  Star,
} from 'lucide-react'
import type { Experience, ExperienceCategory } from '@/lib/api'
import { EXPERIENCE_CATEGORY_LABELS, EXPERIENCE_DIFFICULTY_LABELS } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { SmartImage } from '@/components/ui/SmartImage'
import { useExperienceWishlist } from '@/context/ExperienceWishlistContext'
import { useExperiencePlanner } from '@/context/ExperiencePlannerContext'
import { formatCompact } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export const EXPERIENCE_CATEGORY_META: Record<ExperienceCategory, { className: string }> = {
  ADVENTURE: { className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  CULTURE: { className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  WILDLIFE: { className: 'bg-amber-600/15 text-amber-700 dark:text-amber-400' },
  FOOD: { className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  WELLNESS: { className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400' },
  NATURE: { className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  WATER_ACTIVITIES: { className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
}

interface ExperienceCardProps {
  experience: Experience
  index?: number
}

export function ExperienceCard({ experience, index = 0 }: ExperienceCardProps) {
  const { isWishlisted, toggleWishlist } = useExperienceWishlist()
  const { isPlanned, addToPlanner } = useExperiencePlanner()
  const wishlisted = isWishlisted(experience.slug)
  const planned = isPlanned(experience.slug)
  const detailHref = `/experiences/${experience.slug || experience.id}`

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease: 'easeOut' }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/5 hover:ring-primary/25"
    >
      <div className="relative h-44 shrink-0 overflow-hidden sm:h-52">
        <Link to={detailHref} className="absolute inset-0" aria-label={experience.name}>
          <SmartImage
            src={experience.image}
            alt={experience.name}
            loading="lazy"
            className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        </Link>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/10 transition-opacity duration-500" aria-hidden="true" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="glass" className="text-white">
            {EXPERIENCE_CATEGORY_LABELS[experience.category] ?? experience.category}
          </Badge>
          {experience.isFeatured && (
            <Badge variant="glass" className="bg-amber-400/90 text-amber-950">
              ✦ Featured
            </Badge>
          )}
        </div>
        <span className="glass-strong absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
          {experience.rating > 0 ? experience.rating.toFixed(1) : 'New'}
          {experience.reviewsCount > 0 && (
            <span className="font-normal text-white/80">({formatCompact(experience.reviewsCount)})</span>
          )}
        </span>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <motion.button
            key={String(wishlisted)}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              toggleWishlist(experience.slug, experience.name)
            }}
            aria-pressed={wishlisted}
            aria-label={wishlisted ? `Remove ${experience.name} from wishlist` : `Add ${experience.name} to wishlist`}
            className="press glass flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-transform duration-300 hover:scale-110"
          >
            <Heart
              className={cn('h-4 w-4 transition-colors', wishlisted ? 'fill-red-500 text-red-500' : 'text-white')}
              aria-hidden="true"
            />
          </motion.button>
          <motion.button
            key={String(planned)}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              if (!planned) {
                addToPlanner({
                  slug: experience.slug,
                  name: experience.name,
                  city: experience.city,
                  price: experience.price,
                  duration: experience.duration,
                })
              }
            }}
            disabled={planned}
            aria-pressed={planned}
            aria-label={planned ? `${experience.name} is in Trip Planner` : `Add ${experience.name} to Trip Planner`}
            className={cn(
              'press glass flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-transform duration-300 hover:scale-110',
              planned && 'bg-primary/90',
            )}
          >
            <CalendarPlus
              className={cn('h-4 w-4 transition-colors', planned ? 'fill-primary-foreground text-primary-foreground' : 'text-white')}
              aria-hidden="true"
            />
          </motion.button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <Link to={detailHref} className="flex flex-col gap-1">
          <h3 className="font-serif text-lg leading-snug font-semibold text-card-foreground transition-colors group-hover:text-primary">
            {experience.name}
          </h3>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
            {experience.location}
          </span>
        </Link>

        {experience.tagline && (
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{experience.tagline}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground ring-1 ring-border/60">
            <Clock className="h-3 w-3 text-primary" aria-hidden="true" />
            {experience.duration}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground ring-1 ring-border/60">
            <Mountain className="h-3 w-3 text-primary" aria-hidden="true" />
            {EXPERIENCE_DIFFICULTY_LABELS[experience.difficulty] ?? experience.difficulty}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-card-foreground">
              <span className="flex items-center">
                <IndianRupee className="mr-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                {experience.price > 0 ? experience.price.toLocaleString('en-IN') : 'Free'}
              </span>
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {experience.bestSeason}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-primary/20 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary">
            Details
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </div>
    </motion.article>
  )
}