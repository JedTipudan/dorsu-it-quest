'use client'

import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { setQuestPublished } from '../actions'

export function PublishToggle({ questId, published, labels = ['Draft', 'Published'] }: { questId: string; published: boolean; labels?: [string, string] }) {
  const [optimistic, setOptimistic] = useOptimistic(published)
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      disabled={pending}
      onClick={() => startTransition(async () => {
        setOptimistic(!optimistic)
        const r = await setQuestPublished(questId, !optimistic)
        if (r.error) toast.error(r.error)
      })}
      className="inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60"
    >
      <span className={cn('relative h-6 w-11 rounded-full transition', optimistic ? 'bg-lime shadow-glow-lime' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', optimistic ? 'left-[22px]' : 'left-0.5')} />
      </span>
      <span className={optimistic ? 'text-lime' : 'text-slate-500'}>{optimistic ? labels[1] : labels[0]}</span>
    </button>
  )
}
