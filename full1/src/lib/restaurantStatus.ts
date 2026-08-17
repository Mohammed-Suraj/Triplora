const TIME_RE = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi

interface ParsedTime {
  minutes: number
  label: string
}

export interface OpeningRange {
  start: number
  end: number
}

export interface RestaurantStatus {
  state: 'open' | 'closed' | 'unknown'
  summary: string
  detail: string | null
}

function parseTime(raw: string): ParsedTime | null {
  TIME_RE.lastIndex = 0
  const match = TIME_RE.exec(raw.toLowerCase())
  if (!match) return null
  let hours = Number(match[1]) % 24
  const minutes = Number(match[2] ?? 0)
  if (match[3] === 'pm' && hours < 12) hours += 12
  if (match[3] === 'am' && hours === 12) hours = 0
  const minutesOfDay = hours * 60 + minutes
  return { minutes: minutesOfDay, label: formatLabel(minutesOfDay) }
}

function formatLabel(minutes: number): string {
  const total = ((minutes % 1440) + 1440) % 1440
  const h24 = Math.floor(total / 60)
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const period = h24 < 12 ? 'AM' : 'PM'
  return `${h12}:${String(total % 60).padStart(2, '0')} ${period}`
}

export function parseOpeningRanges(openingHours: string): OpeningRange[] {
  const periods = openingHours
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  const ranges: OpeningRange[] = []
  for (const period of periods) {
    const normalized = period.replace(/[–—]/g, '-')
    const parts = normalized.split('-').map((p) => p.trim()).filter(Boolean)
    if (parts.length < 2) continue
    const start = parseTime(parts[0])
    const end = parseTime(parts[parts.length - 1])
    if (!start || !end) continue
    ranges.push({ start: start.minutes, end: end.minutes })
  }
  return ranges
}

function istMinuteOfDay(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Kolkata',
  }).formatToParts(date)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

export function restaurantStatus(openingHours: string, date: Date = new Date()): RestaurantStatus {
  const ranges = parseOpeningRanges(openingHours)
  if (ranges.length === 0) {
    return { state: 'unknown', summary: 'Hours may vary', detail: null }
  }

  const now = istMinuteOfDay(date)
  const isOpen = ranges.some((range) => {
    if (range.end > range.start) return now >= range.start && now < range.end
    return now >= range.start || now < range.end
  })

  if (isOpen) {
    const current = ranges.find((range) =>
      range.end > range.start
        ? now >= range.start && now < range.end
        : now >= range.start || now < range.end,
    )
    return { state: 'open', summary: 'Open Now', detail: `Closes ${formatLabel(current?.end ?? ranges[0].end)}` }
  }

  return { state: 'closed', summary: 'Closed', detail: `Opens ${formatLabel(ranges[0].start)}` }
}