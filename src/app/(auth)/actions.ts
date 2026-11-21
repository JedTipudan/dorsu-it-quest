'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { homeFor } from '@/lib/auth'
import { SITE_URL, SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/env'
import { clientIp, norm, rateLimit } from '@/lib/rate-limit'
import { safePath } from '@/lib/safe-path'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'

const NOT_CONFIGURED: ActionState = {
  error: 'The database is not connected yet. Add your Supabase keys to the environment variables (see README).',
}

async function origin() {
  if (SITE_URL) return SITE_URL
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

function safeNext(next: FormDataEntryValue | null) {
  return safePath(next)
}

/** Cloudflare Turnstile token from the form (only used when CAPTCHA is enabled in Supabase). */
function captcha(formData: FormData) {
  const t = formData.get('captchaToken')
  return typeof t === 'string' && t ? t : undefined
}

function friendlyAuthError(message: string) {
  if (/captcha/i.test(message)) return 'Security check failed or expired. Please complete it again.'
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first — check your inbox for the verification link.'
  if (/already registered|already been registered/i.test(message)) return 'An account with this email already exists. Try logging in instead.'
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a minute and try again.'
  return message
}

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED
  const parsed = z.object({ email: z.email(), password: z.string().min(1) }).safeParse({
    email: String(formData.get('email') ?? '').trim(),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Enter a valid email and your password.' }

  // Brute-force protection: tight per IP+account, generous per IP (a lab shares one IP), per account overall.
  const ip = await clientIp()
  const email = norm(parsed.data.email)
  const limited = await rateLimit([
    { parts: ['login', ip, email], limit: 5, windowSeconds: 900 },
    { parts: ['login-ip', ip], limit: 100, windowSeconds: 900 },
    { parts: ['login-acct', email], limit: 30, windowSeconds: 3600 },
  ])
  if (limited) return { error: limited }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ ...parsed.data, options: { captchaToken: captcha(formData) } })
  if (error) return { error: friendlyAuthError(error.message) }
  const next = safeNext(formData.get('next'))
  if (next) redirect(next)
  // No specific page requested: send each role to its own home.
  const { data: me } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  redirect(homeFor(me?.role))
}

const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name.').max(120),
  display_name: z.string().trim().max(40, 'Display name must be 40 characters or fewer.').optional(),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
  year_level: z.enum(['1', '2', '3', '4'], { message: 'Select your year level.' }),
  section: z.string().trim().max(30).optional(),
  consent: z.literal('on', { message: 'Please read and accept the data privacy consent.' }),
})

export async function register(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED
  const parsed = registerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check the form.' }

  const { email, password, consent: _consent, ...meta } = parsed.data
  void _consent
  const ip = await clientIp()
  const limited = await rateLimit([
    { parts: ['signup-ip', ip], limit: 60, windowSeconds: 3600 },
    { parts: ['signup-acct', norm(email)], limit: 5, windowSeconds: 3600 },
  ])
  if (limited) return { error: limited }
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta, captchaToken: captcha(formData), emailRedirectTo: `${await origin()}/auth/callback?next=/dashboard` },
  })
  if (error) return { error: friendlyAuthError(error.message) }

  // Supabase returns a fake user with no identities when the email already exists.
  if (data.user && data.user.identities?.length === 0) {
    return { error: 'An account with this email already exists. Try logging in instead.' }
  }
  if (data.session) redirect('/dashboard?welcome=1')
  return { ok: true, message: `Almost there! We sent a confirmation link to ${email}. Open it to activate your account.` }
}

export async function logout() {
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect('/')
}

export async function forgotPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED
  const email = String(formData.get('email') ?? '').trim()
  if (!z.email().safeParse(email).success) return { error: 'Enter a valid email address.' }
  const limited = await rateLimit([
    { parts: ['reset-acct', norm(email)], limit: 3, windowSeconds: 3600 },
    { parts: ['reset-ip', await clientIp()], limit: 20, windowSeconds: 3600 },
  ])
  if (limited) return { error: limited }
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
    captchaToken: captcha(formData),
  })
  if (error) return { error: friendlyAuthError(error.message) }
  return { ok: true, message: 'If an account exists for that email, a password reset link is on its way.' }
}

export async function updatePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirm) return { error: 'Passwords do not match.' }
  if (password.length > 72) return { error: 'Password must be 72 characters or fewer.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your reset link has expired. Request a new one.' }
  const limited = await rateLimit([{ parts: ['pw-update', user.id], limit: 5, windowSeconds: 3600 }])
  if (limited) return { error: limited }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: friendlyAuthError(error.message) }
  redirect('/dashboard')
}

/** Asks Supabase (public settings endpoint, cached 60 s) whether the Google provider is switched on. */
async function googleEnabled() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY }, next: { revalidate: 60 } })
    if (!res.ok) return true // unknown: let Supabase decide
    const json = (await res.json()) as { external?: { google?: boolean } }
    return json.external?.google !== false
  } catch {
    return true
  }
}

/**
 * "Continue with Google" (Supabase OAuth, PKCE). Works for both login and sign-up: a first-time
 * Google user gets an account and profile automatically (the profile trigger reads Google's full_name).
 * Sign-up requires the same informed-consent checkbox as the email form (RA 10173).
 */
export async function signInWithGoogle(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED
  if (formData.get('intent') === 'register' && formData.get('consent') !== 'on') {
    return { error: 'Please tick the consent box first.' }
  }
  const next = safeNext(formData.get('next'))
  const limited = await rateLimit([{ parts: ['google-ip', await clientIp()], limit: 60, windowSeconds: 600 }])
  if (limited) return { error: limited }
  if (!(await googleEnabled())) {
    return { error: 'Google sign-in is not enabled yet. An admin must turn on the Google provider in Supabase (see the setup guide). You can still use email.' }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${await origin()}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
      queryParams: { prompt: 'select_account' }, // let users pick which Gmail account
    },
  })
  if (error || !data.url) {
    const msg = error?.message ?? ''
    if (/provider is not enabled|unsupported provider/i.test(msg)) {
      return { error: 'Google sign-in is not enabled yet. An admin must turn on the Google provider in Supabase (see the setup guide).' }
    }
    return { error: msg || 'Could not start Google sign-in. Please try again.' }
  }
  redirect(data.url)
}
