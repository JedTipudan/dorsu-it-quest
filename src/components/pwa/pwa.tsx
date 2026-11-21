'use client'

import { Download, Share, WifiOff, X } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Registers /sw.js in production builds. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {})
  }, [])
  return null
}

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

/** Slim banner shown while the device is offline. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  if (online) return null
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-gold px-4 py-1.5 text-sm font-semibold text-[#2a1a00]">
      <WifiOff className="size-4" aria-hidden="true" /> You are offline — progress will sync when you reconnect.
    </div>
  )
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}
const subscribeInstall = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function useInstallState() {
  const canPrompt = useSyncExternalStore(subscribeInstall, () => deferred !== null, () => false)
  const standalone = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as { standalone?: boolean }).standalone)),
    () => true,
  )
  const ios = useSyncExternalStore(() => () => {}, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false)
  return { canPrompt, standalone, ios }
}

/** "Install app" button — native prompt on Chrome/Edge/Android, instructions on iOS Safari. */
export function InstallButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { canPrompt, standalone, ios } = useInstallState()
  const [showIosHelp, setShowIosHelp] = useState(false)

  if (standalone || (!canPrompt && !ios)) return null

  async function install() {
    if (deferred) {
      await deferred.prompt()
      await deferred.userChoice
      deferred = null
      listeners.forEach((l) => l())
    } else if (ios) {
      setShowIosHelp(true)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl font-semibold transition',
          compact ? 'px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100' : 'bg-white/15 px-4 py-2.5 text-sm text-white ring-1 ring-white/30 hover:bg-white/25',
          className,
        )}
      >
        <Download className="size-4" aria-hidden="true" /> Install app
      </button>
      {showIosHelp && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => setShowIosHelp(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="ios-install-title" className="card w-full max-w-sm p-5 animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h2 id="ios-install-title" className="text-lg font-bold">Install on iPhone / iPad</h2>
              <button type="button" aria-label="Close" onClick={() => setShowIosHelp(false)} className="grid size-9 place-items-center rounded-lg hover:bg-indigo-50">
                <X className="size-4" />
              </button>
            </div>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Tap the <Share className="inline size-4 align-text-bottom" aria-label="Share" /> Share button in Safari.</li>
              <li>Choose <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong>. DOrSU IT Quest now opens like an app.</li>
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
