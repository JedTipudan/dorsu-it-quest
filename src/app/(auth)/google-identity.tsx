'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert } from '@/components/ui/misc'
import { GOOGLE_CLIENT_ID } from '@/lib/env'
import { createClient } from '@/lib/supabase/client'

// Minimal typing for Google Identity Services (https://accounts.google.com/gsi/client)
interface GsiButtonOptions { theme?: string; size?: string; text?: string; shape?: string; width?: number; logo_alignment?: string }
interface Gsi {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; nonce?: string; ux_mode?: 'popup'; auto_select?: boolean; context?: string; itp_support?: boolean }) => void
      renderButton: (el: HTMLElement, o: GsiButtonOptions) => void
    }
  }
}
declare global { interface Window { google?: Gsi } }

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let scriptPromise: Promise<void> | null = null
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { scriptPromise = null; reject(new Error('Could not load Google sign-in.')) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

/** Random nonce for the request + its SHA-256 (Google embeds the hash; Supabase checks it against the raw value). */
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/[+/=]/g, '')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}

/**
 * Google's official "Sign in with Google" button. The account chooser opens as a popup on this site,
 * so it reads "to continue to <this site>", not the Supabase project address. The returned ID token
 * is exchanged for a normal Supabase session with signInWithIdToken.
 */
export function GoogleIdentityButton({ intent, next, onUnavailable, getCaptchaToken, onAttempt }: {
  intent: 'login' | 'register'; next?: string; onUnavailable: () => void
  /** latest CAPTCHA token (when Supabase CAPTCHA protection is on) */
  getCaptchaToken?: () => string | undefined
  /** called after each sign-in attempt (CAPTCHA tokens are single-use) */
  onAttempt?: () => void
}) {
  const holder = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await loadGsi()
        const nonce = await makeNonce()
        if (cancelled || !holder.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hashed,
          ux_mode: 'popup',
          auto_select: false,
          itp_support: true,
          context: intent === 'register' ? 'signup' : 'signin',
          callback: async ({ credential }) => {
            setBusy(true)
            setError(null)
            const { error: e } = await createClient().auth.signInWithIdToken({
              provider: 'google', token: credential, nonce: nonce.raw, options: { captchaToken: getCaptchaToken?.() },
            })
            onAttempt?.()
            if (e) {
              setBusy(false)
              setError(/captcha/i.test(e.message)
                ? 'Security check failed or expired. Please complete it again.'
                : /provider is not enabled|unsupported provider/i.test(e.message)
                ? 'Google sign-in is not enabled in Supabase yet (see the setup guide).'
                : /audience|client id/i.test(e.message)
                  ? 'This Google client ID is not allowed in Supabase. Add it to the Google provider’s Client IDs.'
                  : e.message)
              return
            }
            window.location.assign(next || '/auth/landing')
          },
        })
        const width = Math.min(400, Math.max(240, Math.round(holder.current.getBoundingClientRect().width)))
        window.google.accounts.id.renderButton(holder.current, {
          theme: 'filled_black', size: 'large', shape: 'rectangular', logo_alignment: 'left', width,
          text: intent === 'register' ? 'signup_with' : 'continue_with',
        })
      } catch {
        if (!cancelled) onUnavailable() // blocked script / offline: fall back to the redirect button
      }
    })()
    return () => { cancelled = true }
  }, [intent, next, onUnavailable, getCaptchaToken, onAttempt])

  return (
    <div className="space-y-2">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="relative flex min-h-11 justify-center">
        <div ref={holder} className={busy ? 'pointer-events-none opacity-40' : undefined} />
        {busy && <p className="absolute inset-0 grid place-items-center font-display text-sm text-white uppercase">Signing you in…</p>}
      </div>
    </div>
  )
}
