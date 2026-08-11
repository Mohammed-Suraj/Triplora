import { useEffect, useState } from 'react'
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Eye,
  Snowflake,
  Sun,
  Sunrise,
  Sunset,
  Umbrella,
  Wind,
} from 'lucide-react'
import type { WeatherData } from '@/lib/api'
import { weatherApi } from '@/lib/api'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface WeatherCardProps {
  latitude: number
  longitude: number
  destinationName: string
}

function iconForCode(code: number) {
  if (code === 0 || code === 1) return Sun
  if (code === 2) return CloudSun
  if (code === 3) return Cloud
  if (code === 45 || code === 48) return CloudFog
  if (code >= 51 && code <= 67) return CloudRain
  if (code >= 71 && code <= 77) return Snowflake
  if (code >= 80 && code <= 82) return CloudRain
  if (code >= 95) return CloudLightning
  return CloudSun
}

const FORECAST_ICONS: Record<string, typeof Sun> = {
  sun: Sun,
  cloudsun: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: Snowflake,
  storm: CloudLightning,
}

export function WeatherCard({ latitude, longitude, destinationName }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setUnavailable(false)
    weatherApi
      .get(latitude, longitude)
      .then((res) => {
        if (!active) return
        if (res.data) {
          setWeather(res.data)
        } else {
          setUnavailable(true)
        }
      })
      .catch(() => {
        if (active) setUnavailable(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [latitude, longitude])

  if (loading) {
    return (
      <div className="glass-strong flex flex-col gap-4 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-14 w-28" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (unavailable || !weather) {
    return (
      <div className="glass-strong flex flex-col items-center gap-2 rounded-2xl p-6 text-center shadow-sm">
        <CloudSun className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">Weather unavailable.</p>
        <p className="text-xs text-muted-foreground/70">
          Live conditions could not be loaded right now. Please check back shortly.
        </p>
      </div>
    )
  }

  const CurrentIcon = iconForCode(weather.current.code)
  const stats = [
    { icon: Droplets, label: 'Humidity', value: `${weather.current.humidity}%` },
    { icon: Wind, label: 'Wind', value: `${weather.current.windSpeed} km/h` },
    { icon: Umbrella, label: 'Rain chance', value: `${weather.current.rainProbability}%` },
    { icon: Sun, label: 'UV index', value: String(weather.current.uvIndex) },
    { icon: Eye, label: 'Visibility', value: `${weather.current.visibilityKm} km` },
    { icon: Sunrise, label: 'Sunrise', value: weather.current.sunrise },
    { icon: Sunset, label: 'Sunset', value: weather.current.sunset },
  ]

  return (
    <div className="glass-strong flex flex-col gap-6 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CloudSun className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Live Weather</span>
            <span className="text-xs text-muted-foreground">{destinationName}</span>
          </div>
        </div>
        <span className="hidden text-xs text-muted-foreground/70 sm:block">
          Updated {new Date(weather.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="flex items-end gap-2">
          <span className="font-serif text-5xl font-bold text-foreground">
            {weather.current.temperature}
            <span className="text-2xl font-semibold text-muted-foreground">{'\u00B0C'}</span>
          </span>
          <CurrentIcon className="mb-1 h-8 w-8 text-accent" aria-hidden="true" />
        </span>
        <span className="text-sm text-muted-foreground">
          {weather.current.condition} - feels like {weather.current.feelsLike}
          {'\u00B0C'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-xl bg-background/60 p-3"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <stat.icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {stat.label}
            </span>
            <span className="text-sm font-semibold text-foreground">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          7-day forecast
        </span>
        <ul className="flex flex-col">
          {weather.daily.map((day) => {
            const DayIcon =
              FORECAST_ICONS[
                day.code === 0 || day.code === 1
                  ? 'sun'
                  : day.code === 2
                    ? 'cloudsun'
                    : day.code === 45 || day.code === 48
                      ? 'fog'
                      : day.code >= 95
                        ? 'storm'
                        : day.code >= 80 || day.code >= 51
                          ? 'rain'
                          : day.code >= 71 && day.code <= 77
                            ? 'snow'
                            : 'cloud'
              ]
            return (
              <li
                key={day.date}
                className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0"
              >
                <span
                  className={cn(
                    'w-16 text-sm font-medium',
                    day.dayLabel === 'Today' ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {day.dayLabel}
                </span>
                <DayIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="flex-1 truncate text-sm text-muted-foreground">{day.condition}</span>
                <span className="text-sm text-muted-foreground">
                  {day.min}
                  {'\u00B0'} / {day.max}
                  {'\u00B0C'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
