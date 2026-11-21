'use client'

import { AlertTriangle } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/button'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center p-4">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-red-100 text-red-600">
          <AlertTriangle className="size-8" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-slate-600">
          {error.message && !error.digest ? error.message : 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <LinkButton href="/dashboard" variant="outline">Dashboard</LinkButton>
        </div>
      </div>
    </main>
  )
}
