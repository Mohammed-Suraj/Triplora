const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatINR(amount: number): string {
  return INR.format(amount)
}

export function formatDate(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDaysISO(iso: string, days: number): string {
  const date = new Date(iso + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return iso
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn + 'T00:00:00')
  const end = new Date(checkOut + 'T00:00:00')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))
}

export const HOTEL_TAX_RATE = 0.18

export function taxFor(amount: number): number {
  return Math.round(amount * HOTEL_TAX_RATE)
}

export function formatCompact(count: number): string {
  if (count < 1000) return String(count)
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
}
