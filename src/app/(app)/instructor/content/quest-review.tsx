'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/misc'
import { SubmitButton } from '@/components/ui/submit-button'
import { useServerForm } from '@/components/ui/use-server-form'
import { cn } from '@/lib/utils'
import { interpret } from '@/lib/validation'
import { saveQuestReview } from '../actions'

export interface Review {
  reviewer_id: string
  accuracy: number
  alignment: number
  difficulty_fit: number
  technical: number
  comment: string
  updated_at: string
  profiles?: { display_name: string; full_name: string } | null
}

/** The four criteria of the study's expert validation rubric. */
const CRITERIA = [
  { key: 'accuracy', label: 'Content accuracy', hint: 'Questions, answers and explanations are correct' },
  { key: 'alignment', label: 'Curriculum alignment', hint: 'Matches the BSIT competencies being taught' },
  { key: 'difficulty_fit', label: 'Difficulty fit', hint: 'Appropriate challenge for the target year level' },
  { key: 'technical', label: 'Technical quality', hint: 'Works correctly; clear wording and formatting' },
] as const
type Key = (typeof CRITERIA)[number]['key']

export function QuestReview({ questId, reviews, myId, unavailable }: { questId: string; reviews: Review[]; myId: string; unavailable?: boolean }) {
  const mine = reviews.find((r) => r.reviewer_id === myId)
  const [scores, setScores] = useState<Record<Key, number>>({
    accuracy: mine?.accuracy ?? 0, alignment: mine?.alignment ?? 0, difficulty_fit: mine?.difficulty_fit ?? 0, technical: mine?.technical ?? 0,
  })
  const { state, onSubmit, pending } = useServerForm(saveQuestReview.bind(null, questId))
  useEffect(() => { if (state?.ok) toast.success(state.message) }, [state])

  const n = reviews.length
  const means = CRITERIA.map((c) => ({ ...c, mean: n ? reviews.reduce((a, r) => a + r[c.key], 0) / n : 0 }))
  const overall = n ? means.reduce((a, m) => a + m.mean, 0) / means.length : 0
  const complete = CRITERIA.every((c) => scores[c.key] > 0)

  return (
    <section className="card overflow-hidden" aria-labelledby="ev-h">
      <header className="flex items-start gap-3 border-b border-line p-5">
        <span className="chamfer-sm grid size-10 shrink-0 place-items-center bg-gold/15 text-gold"><ClipboardCheck className="size-5" aria-hidden="true" /></span>
        <div className="flex-1">
          <h2 id="ev-h" className="font-display text-lg font-bold text-white uppercase">Expert validation</h2>
          <p className="text-sm text-slate-600">Faculty validators rate this quest before it&apos;s used with students (study Objective 3). Ratings are visible to staff only.</p>
        </div>
        {n > 0 && (
          <div className="text-right">
            <p className="font-display text-3xl leading-none font-bold" style={{ color: interpret(overall).color }}>{overall.toFixed(2)}</p>
            <p className="hud text-[9px]">{interpret(overall).label} · {n} rater{n > 1 ? 's' : ''}</p>
          </div>
        )}
      </header>

      {unavailable ? (
        <p className="p-5 text-sm text-slate-600">Run <code>supabase/upgrade-staff-tools.sql</code> in the Supabase SQL Editor to enable validation.</p>
      ) : (
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="hud">{mine ? 'Your rating (you can update it)' : 'Your rating'}</p>
            {state?.error && <Alert tone="error">{state.error}</Alert>}
            {CRITERIA.map((c) => (
              <fieldset key={c.key}>
                <legend className="text-sm font-semibold text-slate-900">{c.label}</legend>
                <p className="mb-1.5 text-xs text-slate-500">{c.hint}</p>
                <input type="hidden" name={c.key} value={scores[c.key] || ''} />
                <div className="flex gap-1" role="radiogroup" aria-label={c.label}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={scores[c.key] === v} onClick={() => setScores((s) => ({ ...s, [c.key]: v }))}
                      className={cn('h-9 flex-1 rounded-md font-display text-sm font-bold transition',
                        scores[c.key] >= v ? 'bg-gold text-[#2a1a00]' : 'bg-panel-2 text-slate-500 ring-1 ring-line hover:text-white')}>
                      {v}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <div>
              <label htmlFor="rv-comment" className="text-sm font-semibold text-slate-900">Comments / suggested revisions</label>
              <textarea id="rv-comment" name="comment" defaultValue={mine?.comment ?? ''} maxLength={1000} rows={3}
                className="mt-1.5 w-full rounded-lg border border-line bg-[#090b20] px-3 py-2 text-slate-900 focus:border-lime focus:ring-4 focus:ring-lime/15 focus:outline-none"
                placeholder="e.g. Item 4's explanation should mention the broadcast address." />
            </div>
            <SubmitButton pending={pending} variant="accent" disabled={!complete} pendingText="Saving…">{mine ? 'Update rating' : 'Submit rating'}</SubmitButton>
            <p className="text-[11px] text-slate-500">Scale: 1 Poor · 2 Fair · 3 Good · 4 Very good · 5 Excellent</p>
          </form>

          <div>
            <p className="hud mb-3">Summary (weighted means)</p>
            {n === 0 ? (
              <p className="text-sm text-slate-600">No ratings yet. Ask the faculty validators to rate this quest.</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {means.map((m) => (
                    <li key={m.key}>
                      <div className="flex justify-between text-sm"><span className="text-slate-700">{m.label}</span>
                        <span className="font-mono font-bold" style={{ color: interpret(m.mean).color }}>{m.mean.toFixed(2)} · {interpret(m.mean).label}</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-slate-100">
                        <div className="h-full" style={{ width: `${(m.mean / 5) * 100}%`, background: interpret(m.mean).color }} />
                      </div>
                    </li>
                  ))}
                </ul>
                {reviews.some((r) => r.comment) && (
                  <ul className="mt-5 space-y-2">
                    {reviews.filter((r) => r.comment).map((r) => (
                      <li key={r.reviewer_id} className="rounded-lg bg-panel-2 p-3 text-sm ring-1 ring-line">
                        <p className="hud mb-1 text-[9px]">{r.reviewer_id === myId ? 'You' : r.profiles?.display_name || r.profiles?.full_name || 'Validator'}</p>
                        <p className="text-slate-700">{r.comment}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
