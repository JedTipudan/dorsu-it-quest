import 'server-only'

import { createHmac, randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side rate limiting for sensitive actions (login, sign-up, password reset, exports).
 *
 * Counters live in Postgres (public.check_rate_limit) so limits hold across every Vercel
 * instance. Keys are HMAC-SHA256 hashed with RATE_LIMIT_SECRET, so even though the database
 * function is reachable with the public anon key, nobody can compute another person's key to
 * lock them out on purpose.
 *
 * Limits are sized for campus networks: a whole computer lab often shares ONE public IP, so
 * per-IP limits are generous and the tight limits are per IP+account.
 */

let warned = false
const fallbackSecret = randomBytes(32).toString('hex')
function secret() {
  const s = process.env.RATE_LIMIT_SECRET
  if (s && s.length >= 16) return s
  if (!warned && process.env.NODE_ENV === 'production') {
    console.warn('[rate-limit] RATE_LIMIT_SECRET is not set: using a per-instance secret (limits are weaker). Set it in Vercel.')
    warned = true
  }
  return fallbackSecret
}

/** The visitor's IP (Vercel sets x-forwarded-for; the first entry is the real client). */
export async function clientIp() {
  const h = await headers()
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'local').trim()
}

const keyFor = (parts: string[]) => 'srv:' + createHmac('sha256', secret()).update(parts.join('|')).digest('hex')

export interface Rule {
  /** what is being limited, e.g. ['login', ip, email] */
  parts: string[]
  limit: number
  windowSeconds: number
}

/**
 * Records one attempt against every rule. Returns a friendly error message if any rule is over
 * its limit, otherwise null. Fails OPEN (allows) if the limiter itself is unavailable, so a
 * database hiccup never locks everyone out; Supabase's own auth limits still apply then.
 */
export async function rateLimit(rules: Rule[]): Promise<string | null> {
  try {
    const supabase = await createClient()
    const results = await Promise.all(rules.map((r) =>
      supabase.rpc('check_rate_limit', { p_key: keyFor(r.parts), p_limit: r.limit, p_window_seconds: r.windowSeconds })))
    const failed = results.findIndex((r) => r.data === false)
    if (failed >= 0) {
      const mins = Math.max(1, Math.ceil(rules[failed].windowSeconds / 60))
      return `Too many attempts. For your security, please wait up to ${mins} minute${mins > 1 ? 's' : ''} and try again.`
    }
    const error = results.find((r) => r.error)?.error
    if (error) console.error('[rate-limit] limiter unavailable (is supabase/upgrade-security.sql installed?):', error.message)
    return null
  } catch (e) {
    console.error('[rate-limit] limiter error:', e)
    return null
  }
}

export const norm = (email: string) => email.trim().toLowerCase()
