import { motion } from 'framer-motion'
import { CloudOff, CloudRain, CloudSun, Sun, Umbrella } from 'lucide-react'
import type { WeatherDay } from '@/lib/api'
import { cn } from '@/lib/utils'

export interface DayWeatherEntry {
  dayId: string
  label: string
  location: string
  weather: WeatherDay | null
  loading: boolean
  /** e.g. "Sat, 14 Sep" — shown as a fallback when the forecast itself is missing. */
  dateLabel: string
}

function glyph(weather: WeatherDay | null): { icon: typeof Sun; className: string } {
  if (!weather) return { icon: CloudOff, className: 'text-muted-foreground' }
  const code = weather.code
  if (code <= 2) return { icon: Sun, className: 'text-amber-500' }
  if (code <= 48) return { icon: CloudSun, className: 'text-sky-500' }
  return { icon: code >= 95 ? CloudRain : Umbrella, className: 'text-sky-600 dark:text-sky-400' }
}

export function PlannerWeatherStrip({ entries }: { entries: DayWeatherEntry[] }) {
  const hasAnyLocation = entries.some((entry) => entry.location)

  return (
    <section className="flex flex-col gap-2" aria-label="Weather outlook">
      <h3 className="font-serif text-lg font-semibold text-foreground">Weather outlook</h3>

      {!hasAnyLocation ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <CloudSun className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-card-foreground">Forecast unlocks with stops</p>
            <p className="text-xs text-muted-foreground">
              Add stops with locations and Triplora pulls a 7-day forecast for each day of your trip.
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {entries.map((entry, index) => {
            const { icon: Icon, className } = glyph(entry.weather)
            return (
              <motion.div
                key={entry.dayId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
                className="flex w-40 shrink-0 flex-col gap-1 rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-border"
              >
                <span className="flex items-center justify-between gap-1 text-xs font-semibold text-card-foreground">
                  {entry.label}
                  <Icon className={cn('h-4 w-4', className)} aria-hidden="true" />
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {entry.location || entry.dateLabel || entry.label}
                </span>
                {entry.loading ? (
                  <span className="text-xs text-muted-foreground">Loading forecast…</span>
                ) : entry.weather ? (
                  <>
                    <span className="text-sm font-bold text-card-foreground">
                      {entry.weather.max}°<span className="font-medium text-muted-foreground"> / {entry.weather.min}°</span>
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">{entry.weather.condition}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {entry.location ? 'No forecast yet' : 'Add stops to unlock the forecast'}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </section>
  )
}
