'use client'

import { Trash2 } from 'lucide-react'
import { useTransition } from 'react'
import { deleteFeedback } from '../actions'

export function DeleteFeedbackButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button type="button" disabled={pending} aria-label="Delete feedback"
      onClick={() => { if (window.confirm('Delete this feedback?')) startTransition(() => deleteFeedback(id)) }}
      className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
      <Trash2 className="size-4" />
    </button>
  )
}
