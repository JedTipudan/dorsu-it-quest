import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'
import type { Profile } from '@/lib/types'

/**
 * Current user + profile (memoized per request).
 * getClaims() verifies the JWT locally (cached JWKS) instead of a network round-trip to
 * Supabase Auth on every render like getUser(); on legacy HS256 keys it falls back to getUser().
 */
export const getSession = cache(async () => {
  await connection() // always render per request — never prerender user-specific pages
  if (!isSupabaseConfigured) return { supabase: null, user: null, profile: null }
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const user = claims?.sub ? { id: claims.sub, email: claims.email as string | undefined } : null
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>()
  return { supabase, user, profile }
})

export const PROFILE_ERROR =
  'You are signed in, but your player profile could not be loaded. The database setup is incomplete (usually missing table permissions). Re-run supabase/setup.sql or the permission fix from the setup guide, then reload.'

export async function requireUser() {
  const { supabase, user, profile } = await getSession()
  if (!supabase || !user) redirect('/login')
  // Signed in but no readable profile: show the reason instead of bouncing between
  // /dashboard and /login forever (the proxy sends signed-in users away from /login).
  if (!profile) redirect(`/login?error=${encodeURIComponent(PROFILE_ERROR)}`)
  return { supabase, user, profile }
}

export async function requireStaff() {
  const session = await requireUser()
  if (session.profile.role === 'student') redirect('/dashboard')
  return session
}

export async function requireAdmin() {
  const session = await requireUser()
  if (session.profile.role !== 'admin') redirect('/dashboard')
  return session
}

export const isStaffRole = (role?: string | null) => role === 'instructor' || role === 'admin'

/** Where each role lands after login: staff get their own Command Center, not the player dashboard. */
export const homeFor = (role?: string | null) => (role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor' : '/dashboard')
