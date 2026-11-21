'use client'

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { Field, Select, Textarea } from '@/components/ui/input'
import { Alert } from '@/components/ui/misc'
import { SubmitButton } from '@/components/ui/submit-button'
import { useServerForm } from '@/components/ui/use-server-form'
import { cn } from '@/lib/utils'
import { submitFeedback } from '../actions'

export function FeedbackForm() {
  const { state, onSubmit, pending } = useServerForm(submitFeedback)
  const [rating, setRating] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message)
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} onSubmit={onSubmit} onReset={() => setRating(0)} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Overall rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" title={`${n} star${n > 1 ? 's' : ''}`}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" required />
              <span className="grid size-11 place-items-center rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500">
                <Star className={cn('size-8 transition', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} aria-hidden="true" />
              </span>
              <span className="sr-only">{n} stars</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Category" htmlFor="category">
        <Select id="category" name="category" defaultValue="general">
          <option value="general">General</option>
          <option value="content">Quest content / questions</option>
          <option value="usability">Ease of use</option>
          <option value="feature">Feature request</option>
          <option value="bug">Bug report</option>
        </Select>
      </Field>
      <Field label="Your feedback" htmlFor="message">
        <Textarea id="message" name="message" required minLength={3} maxLength={2000} placeholder="What did you like? What should we improve or add?" />
      </Field>
      <SubmitButton pending={pending} pendingText="Sending…">Send feedback</SubmitButton>
    </form>
  )
}
