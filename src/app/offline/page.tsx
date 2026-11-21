import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'
import { RetryButton } from './retry-button'

export const metadata: Metadata = { title: 'Offline' }
export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-4">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <WifiOff className="size-8" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold">You&apos;re offline</h1>
        <p className="mt-2 text-slate-600">
          DOrSU IT Quest needs a connection to load quests and save your XP. Check your Wi-Fi or mobile data and try again.
        </p>
        <RetryButton />
      </div>
    </main>
  )
}
