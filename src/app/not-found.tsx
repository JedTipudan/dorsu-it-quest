import { Compass } from 'lucide-react'
import { LinkButton } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-4">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
          <Compass className="size-8" aria-hidden="true" />
        </span>
        <p className="font-display text-5xl font-bold text-indigo-600">404</p>
        <h1 className="mt-1 text-2xl font-bold">This quest doesn&apos;t exist</h1>
        <p className="mt-2 text-slate-600">The page may have moved, or the link is incorrect.</p>
        <LinkButton href="/dashboard" className="mt-6">Back to dashboard</LinkButton>
      </div>
    </main>
  )
}
