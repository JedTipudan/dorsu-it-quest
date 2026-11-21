'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Pill, Progress } from '@/components/ui/misc'
import { LIKERT, MOTIVATION_ITEMS, SUS_ITEMS } from '@/lib/instruments'
import { cn, formatDate } from '@/lib/utils'
import { submitSurvey } from '../actions'

const META = {
  sus: {
    title: 'System Usability Scale (SUS)',
    description: 'Ten quick statements about how easy DOrSU IT Quest is to use.',
    items: SUS_ITEMS.map((text) => ({ text, dimension: '' })),
  },
  motivation: {
    title: 'Motivation & Engagement Scale',
    description: 'Twelve statements about your interest, persistence and engagement while reviewing with the platform.',
    items: MOTIVATION_ITEMS,
  },
}

export function SurveyForm({ instrument, existing }: { instrument: 'sus' | 'motivation'; existing?: { answers: number[]; created_at: string } }) {
  const meta = META[instrument]
  const [answers, setAnswers] = useState<(number | null)[]>(() => existing?.answers ?? Array(meta.items.length).fill(null))
  const [open, setOpen] = useState(!existing)
  const [done, setDone] = useState(Boolean(existing))
  const [pending, startTransition] = useTransition()
  const answered = answers.filter((a) => a !== null).length

  const submit = () => {
    const missing = answers.findIndex((a) => a === null)
    if (missing >= 0) {
      toast.error(`Please answer item ${missing + 1}.`)
      document.getElementById(`${instrument}-${missing}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    startTransition(async () => {
      const res = await submitSurvey(instrument, answers as number[])
      if (res.error) return void toast.error(res.error)
      toast.success('Thank you! Your response was saved.')
      setDone(true)
      setOpen(false)
    })
  }

  return (
    <section className="card overflow-hidden" aria-labelledby={`${instrument}-title`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-4 p-5 text-left sm:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`${instrument}-title`} className="text-lg font-bold">{meta.title}</h2>
            {done ? <Pill tone="emerald"><CheckCircle2 className="size-3.5" aria-hidden="true" /> Submitted</Pill> : <Pill tone="orange">Pending</Pill>}
          </div>
          <p className="mt-0.5 text-sm text-slate-600">{meta.description}{existing && ` Last submitted ${formatDate(existing.created_at)}.`}</p>
        </div>
        <ChevronDown className={cn('size-5 shrink-0 text-slate-400 transition', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className="border-t border-indigo-50 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <Progress value={(answered / meta.items.length) * 100} label="Survey progress" />
            <span className="text-sm font-semibold whitespace-nowrap text-slate-600">{answered}/{meta.items.length}</span>
          </div>
          <ol className="space-y-5">
            {meta.items.map((item, i) => (
              <li key={i} id={`${instrument}-${i}`}>
                <fieldset>
                  <legend className="mb-2 font-semibold">
                    <span className="mr-1 text-slate-400">{i + 1}.</span> {item.text}
                    {item.dimension && <span className="ml-2 text-xs font-medium text-slate-400">({item.dimension})</span>}
                  </legend>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {LIKERT.map((l) => {
                      const selected = answers[i] === l.value
                      return (
                        <label key={l.value} className={cn('flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-1 py-2 text-center transition', selected ? 'border-indigo-600 bg-indigo-50' : 'border-indigo-100 hover:border-indigo-300')}>
                          <input type="radio" name={`${instrument}-${i}`} value={l.value} checked={selected} onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? l.value : v)))} className="sr-only" />
                          <span className={cn('grid size-8 place-items-center rounded-full font-bold', selected ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')}>{l.value}</span>
                          <span className="text-[10px] leading-tight font-medium text-slate-600 sm:text-xs">{l.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
          <Button variant="accent" size="lg" className="mt-6 w-full sm:w-auto" onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {done ? 'Update response' : 'Submit survey'}
          </Button>
        </div>
      )}
    </section>
  )
}
