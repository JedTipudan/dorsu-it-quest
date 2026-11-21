import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number | null | undefined) {
  return new Intl.NumberFormat('en-PH').format(Number(n ?? 0))
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.max(0, Math.floor(seconds % 60))
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d))
}

export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(d))
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

/** Postgres numeric columns arrive as strings — normalize them. */
export function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Postgres/PostgREST errors → a clean user-facing sentence. */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!e) return fallback
  if (typeof e === 'string') return e
  if (typeof e === 'object' && e && 'message' in e && typeof e.message === 'string') return e.message
  return fallback
}

/** ISO timestamp `days` ago (server-side query helper). */
export function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

/** Start of "today" in Asia/Manila (fixed UTC+8, no DST) as an ISO timestamp. */
/** Today's calendar date in Asia/Manila as YYYY-MM-DD (matches public.manila_today()). */
export function manilaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
}

export function manilaMidnightIso() {
  const DAY = 86_400_000, PH = 8 * 3_600_000
  return new Date(Math.floor((Date.now() + PH) / DAY) * DAY - PH).toISOString()
}

/** One CSV cell: quoted, with spreadsheet formula injection neutralized. */
export function csvCell(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}
