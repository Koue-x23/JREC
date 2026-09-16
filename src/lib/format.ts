// Formatting + date helpers used across the app.

const php = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const phpCompact = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function money(value: number): string {
  return php.format(Number.isFinite(value) ? value : 0)
}

/** Compact peso for KPI cards / charts: ₱1.2M, ₱85K */
export function moneyShort(value: number): string {
  const v = Math.abs(value)
  if (v >= 1_000_000) return `₱${(value / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  if (v >= 10_000) return `₱${Math.round(value / 1_000)}K`
  return phpCompact.format(value)
}

export function num(value: number): string {
  return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0,
  )
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** today's date in local time as YYYY-MM-DD */
export function todayStr(): string {
  return toDayStr(new Date())
}

export function toDayStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(day: string, days: number): string {
  const d = parseDay(day)
  d.setDate(d.getDate() + days)
  return toDayStr(d)
}

export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addMonths(day: string, months: number): string {
  const d = parseDay(day)
  d.setMonth(d.getMonth() + months)
  return toDayStr(d)
}

/** '2026-09-16' -> 'Sep 16, 2026' */
export function fmtDate(day: string | null | undefined): string {
  if (!day) return '—'
  const d = parseDay(day.slice(0, 10))
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** '2026-09-16' -> 'Sep 16' */
export function fmtDateShort(day: string | null | undefined): string {
  if (!day) return '—'
  const d = parseDay(day.slice(0, 10))
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

/** '2026-09-16' -> 'Sep 16, 2026'; '' -> '—' */
export function fmtDateOrDash(day: string | null | undefined): string {
  return day ? fmtDate(day) : '—'
}

export function monthLabel(ym: string): string {
  // '2026-09' -> 'Sep ’26'
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('en-PH', { month: 'short' })
}

export function monthLabelLong(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}

export function daysBetween(a: string, b: string): number {
  const ms = parseDay(b).getTime() - parseDay(a).getTime()
  return Math.round(ms / 86_400_000)
}

export function isPastDue(dueDate: string, onDay: string = todayStr()): boolean {
  return dueDate < onDay
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
