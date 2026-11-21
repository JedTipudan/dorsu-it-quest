'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { TURNSTILE_SITE_KEY } from '@/lib/env'

/**
 * Cloudflare Turnstile human check, shared by every auth form on the page.
 * Each token is single-use, so forms call reset() after every submission.
 * Disabled (required = false) when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set.
 */
interface Turnstile {
  render: (el: HTMLElement, o: {
    sitekey: string; theme?: 'dark' | 'light' | 'auto'; size?: 'normal' | 'flexible' | 'compact'; action?: string
    callback: (token: string) => void; 'expired-callback'?: () => void; 'error-callback'?: () => void
  }) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}
declare global { interface Window { turnstile?: Turnstile } }

interface CaptchaState { required: boolean; token: string | null; reset: () => void; setWidget: (id: string | null) => void; setToken: (t: string | null) => void }
const Ctx = createContext<CaptchaState>({ required: false, token: null, reset: () => {}, setWidget: () => {}, setToken: () => {} })

export function CaptchaProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const widget = useRef<string | null>(null)
  const reset = useCallback(() => {
    setToken(null)
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current)
  }, [])
  const setWidget = useCallback((id: string | null) => { widget.current = id }, [])
  const value = useMemo(() => ({ required: Boolean(TURNSTILE_SITE_KEY), token, reset, setWidget, setToken }), [token, reset, setWidget])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useCaptcha = () => useContext(Ctx)

let scriptPromise: Promise<void> | null = null
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { scriptPromise = null; reject(new Error('Security check could not load.')) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

/** Renders the Turnstile widget once per page (place it inside CaptchaProvider). */
export function CaptchaWidget() {
  const { required, setWidget, setToken } = useCaptcha()
  const holder = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!required) return
    let id: string | null = null
    let cancelled = false
    loadTurnstile().then(() => {
      if (cancelled || !holder.current || !window.turnstile) return
      id = window.turnstile.render(holder.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        size: 'flexible',
        callback: (t) => setToken(t),
        'expired-callback': () => setToken(null),
        'error-callback': () => setToken(null),
      })
      setWidget(id)
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => {
      cancelled = true
      if (id && window.turnstile) window.turnstile.remove(id)
      setWidget(null)
    }
  }, [required, setToken, setWidget])

  if (!required) return null
  return (
    <div className="mt-6 border-t border-line pt-4">
      <p className="hud mb-2 flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-lime" aria-hidden="true" /> Security check</p>
      <div ref={holder} className="min-h-[65px]" />
      {failed && <p className="mt-1 text-xs text-red-700">The security check couldn&apos;t load. Check your connection or disable content blockers, then reload.</p>}
    </div>
  )
}
