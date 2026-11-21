export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

/** False until the Supabase env vars are configured (lets the landing page render on a fresh deploy). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/**
 * Google OAuth Web client ID (public, not a secret). When set, "Sign in with Google" uses Google's own
 * button (Google Identity Services): sign-in happens in a popup on THIS site, so Google's account chooser
 * says "to continue to <your site>" instead of "<project>.supabase.co".
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''

/**
 * Cloudflare Turnstile site key (public). When set, login / sign-up / password-reset forms show a
 * human check and send its token to Supabase. Turn CAPTCHA on in Supabase (Auth → Attack Protection)
 * with the matching secret key so bots calling the API directly are rejected too.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''
