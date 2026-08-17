import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BedDouble,
  Bus,
  Check,
  ChefHat,
  CloudSun,
  Gem,
  IndianRupee,
  Landmark,
  Leaf,
  Lightbulb,
  Luggage,
  MapPin,
  Moon,
  NotebookPen,
  PhoneCall,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Sun,
  Sunset,
  UtensilsCrossed,
} from 'lucide-react'
import type { Destination } from '@/data/destinations'
import type { AiTripPlanResult } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SmartImage } from '@/components/ui/SmartImage'
import { RecommendedStays } from '@/components/hotels/RecommendedStays'
import { cn } from '@/lib/utils'

interface SectionIconProps {
  className?: string
}

function PlanSection({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: ComponentType<SectionIconProps>
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('rounded-2xl bg-secondary p-4', className)}>
      <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-card-foreground ring-1 ring-border"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  )
}

function DaySchedule({
  icon: Icon,
  label,
  text,
}: {
  icon: ComponentType<SectionIconProps>
  label: string
  text: string
}) {
  if (!text) return null
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-background p-3 ring-1 ring-border">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-card-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {label}
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}

function isCustomDestination(destination: Destination): boolean {
  return destination.id.startsWith('custom-')
}

interface AiTripPlanViewProps {
  plan: AiTripPlanResult
  onStartOver?: () => void
  actions?: ReactNode
  stayStyle?: string
}

/**
 * Renders a complete AI trip plan (header, trip essentials, per-day cards).
 * Reused by the planner, the trip detail page and the AI chat assistant.
 */
export function AiTripPlanView({ plan, onStartOver, actions, stayStyle }: AiTripPlanViewProps) {
  const { title, summary, bestSeason, itinerary } = plan

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">{title}</span>
          {bestSeason && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Leaf className="h-3 w-3" aria-hidden="true" />
              Best season: {bestSeason}
            </span>
          )}
          {summary && <p className="mt-1 text-sm text-secondary-foreground">{summary}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {onStartOver && (
            <Button variant="outline" size="sm" onClick={onStartOver}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Start over
            </Button>
          )}
        </div>
      </div>

      {(plan.estimatedTotalBudget ||
        plan.weatherAdvice ||
        plan.packingChecklist.length > 0 ||
        plan.travelTips.length > 0 ||
        plan.emergencyContacts.length > 0) && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
          aria-label="Trip essentials"
        >
          <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-card-foreground">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            Trip essentials
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {plan.estimatedTotalBudget && (
              <PlanSection icon={IndianRupee} title="Estimated total budget">
                <p className="text-xl font-bold text-card-foreground">{plan.estimatedTotalBudget}</p>
              </PlanSection>
            )}
            {plan.weatherAdvice && (
              <PlanSection icon={CloudSun} title="Weather advice">
                <p className="text-sm leading-relaxed text-muted-foreground">{plan.weatherAdvice}</p>
              </PlanSection>
            )}
            {plan.packingChecklist.length > 0 && (
              <PlanSection icon={Luggage} title="Packing checklist">
                <ChipList items={plan.packingChecklist} />
              </PlanSection>
            )}
            {plan.travelTips.length > 0 && (
              <PlanSection icon={Lightbulb} title="Travel tips">
                <BulletList items={plan.travelTips} />
              </PlanSection>
            )}
            {plan.emergencyContacts.length > 0 && (
              <PlanSection icon={PhoneCall} title="Emergency contacts" className="md:col-span-2">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {plan.emergencyContacts.map((contact, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2.5 ring-1 ring-border"
                    >
                      <span className="text-sm font-medium text-card-foreground">{contact.label}</span>
                      <span className="text-sm font-semibold text-primary">{contact.phone}</span>
                    </div>
                  ))}
                </div>
              </PlanSection>
            )}
          </div>
        </motion.section>
      )}

      <div className="relative flex flex-col gap-4">
        <span
          className="absolute top-2 bottom-2 left-[27px] hidden w-px bg-border sm:block"
          aria-hidden="true"
        />
        {itinerary.map((item, index) => {
          const custom = isCustomDestination(item.destination)
          return (
            <motion.article
              key={item.day}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
              className="group flex flex-col gap-5 overflow-hidden rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:ring-primary/25 lg:flex-row"
            >
              <div className="relative h-56 w-full shrink-0 overflow-hidden rounded-2xl lg:h-auto lg:w-64">
                <SmartImage
                  src={item.destination.image}
                  alt={item.destination.name}
                  loading="lazy"
                  className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <span className="glass-strong absolute top-3 left-3 flex h-8 items-center rounded-full px-3.5 text-xs font-bold text-white shadow-md">
                  DAY {item.day} — {item.destination.name}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 py-1 sm:pr-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-serif text-xl font-semibold text-card-foreground">
                      {item.destination.name}
                    </h3>
                    {item.destination.region && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.destination.region}, Kerala
                      </span>
                    )}
                  </div>
                  {!custom && <Badge>{item.destination.category}</Badge>}
                </div>
                <p className="text-sm font-medium text-primary">{item.focus}</p>
                {item.destination.description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.destination.description}</p>
                )}

                {(item.morning || item.afternoon || item.evening) && (
                  <div className="mt-1 grid gap-2 sm:grid-cols-3">
                    <DaySchedule icon={Sun} label="Morning" text={item.morning} />
                    <DaySchedule icon={Sunset} label="Afternoon" text={item.afternoon} />
                    <DaySchedule icon={Moon} label="Evening" text={item.evening} />
                  </div>
                )}

                {(item.hotels.length > 0 ||
                  item.restaurants.length > 0 ||
                  item.foodRecommendations.length > 0 ||
                  item.estimatedDailyCost ||
                  item.localTransportation.length > 0 ||
                  item.nearbyAttractions.length > 0 ||
                  item.hiddenGems.length > 0 ||
                  item.shopping.length > 0 ||
                  item.travelNotes) && (
                  <div className="mt-1 grid gap-3 sm:grid-cols-2">
                    {item.estimatedDailyCost && (
                      <PlanSection icon={IndianRupee} title="Estimated daily cost" className="sm:col-span-2">
                        <p className="text-base font-semibold text-card-foreground">{item.estimatedDailyCost}</p>
                      </PlanSection>
                    )}
                    {item.hotels.length > 0 && (
                      <PlanSection icon={BedDouble} title="Hotels">
                        <BulletList items={item.hotels} />
                      </PlanSection>
                    )}
                    {item.restaurants.length > 0 && (
                      <PlanSection icon={UtensilsCrossed} title="Restaurants">
                        <BulletList items={item.restaurants} />
                      </PlanSection>
                    )}
                    {item.foodRecommendations.length > 0 && (
                      <PlanSection icon={ChefHat} title="Food recommendations">
                        <ChipList items={item.foodRecommendations} />
                      </PlanSection>
                    )}
                    {item.localTransportation.length > 0 && (
                      <PlanSection icon={Bus} title="Getting around">
                        <ChipList items={item.localTransportation} />
                      </PlanSection>
                    )}
                    {item.nearbyAttractions.length > 0 && (
                      <PlanSection icon={Landmark} title="Nearby attractions">
                        <ChipList items={item.nearbyAttractions} />
                      </PlanSection>
                    )}
                    {item.hiddenGems.length > 0 && (
                      <PlanSection icon={Gem} title="Hidden gems">
                        <ChipList items={item.hiddenGems} />
                      </PlanSection>
                    )}
                    {item.shopping.length > 0 && (
                      <PlanSection icon={ShoppingBag} title="Shopping">
                        <ChipList items={item.shopping} />
                      </PlanSection>
                    )}
                    {item.travelNotes && (
                      <PlanSection icon={NotebookPen} title="Travel notes" className="sm:col-span-2">
                        <p className="text-sm leading-relaxed text-muted-foreground">{item.travelNotes}</p>
                      </PlanSection>
                    )}
                  </div>
                )}

                {!custom && (
                  <Link
                    to={`/destinations/${item.destination.id}`}
                    className="mt-1 inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    View destination
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
              </motion.article>
            )
          })}
        </div>

      <RecommendedStays
        slugs={plan.itinerary.map((item) => item.destination.slug).filter(Boolean)}
        style={stayStyle}
      />
    </motion.div>
  )
}
