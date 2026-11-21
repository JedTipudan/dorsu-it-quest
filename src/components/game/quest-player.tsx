'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ArrowLeft, ArrowRight, Clock, Flag, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { AttemptResult, Question, Response } from '@/lib/types'
import { cn, formatDuration } from '@/lib/utils'
import { DIFFICULTY_LABEL } from '@/lib/gamification'
import { fxLevel } from '@/lib/motion'
import { isAnswered, QuestionView } from './question-view'
import { ResultsView } from './results-view'

type Submit = (responses: Record<string, Response>, durationSeconds: number) => Promise<{ data?: AttemptResult; error?: string }>

export function QuestPlayer({
  title, questions, timeLimit, onSubmit, backHref, backLabel, allowRetry = false, isAssessment = false, accent = '#8268ff',
}: {
  title: string
  questions: Question[]
  timeLimit: number | null
  onSubmit: Submit
  backHref: string
  backLabel: string
  allowRetry?: boolean
  isAssessment?: boolean
  accent?: string
}) {
  const [index, setIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, Response>>({})
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const startedAt = useRef<number>(0)
  const [elapsed, setElapsed] = useState(0)
  const submittedRef = useRef(false)

  const q = questions[index]
  const answeredCount = useMemo(() => questions.filter((x) => isAnswered(x, responses[x.id])).length, [questions, responses])
  const remaining = timeLimit ? Math.max(0, timeLimit - elapsed) : null

  const submit = useCallback(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    setConfirming(false)
    // Order questions left untouched are submitted in their displayed order.
    const payload: Record<string, Response> = { ...responses }
    for (const x of questions) {
      if (x.kind === 'order' && !payload[x.id]?.order) payload[x.id] = { order: x.options.map((o) => o.id) }
    }
    const duration = Math.round((Date.now() - startedAt.current) / 1000)
    startTransition(async () => {
      const res = await onSubmit(payload, duration)
      if (res.error || !res.data) {
        submittedRef.current = false
        toast.error(res.error ?? 'Could not submit. Check your connection and try again.')
        return
      }
      setResult(res.data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [responses, questions, onSubmit])

  // 3-2-1-GO countdown (3, 2, 1, 0 = "GO", -1 = playing). The quest clock starts after GO.
  const [count, setCount] = useState(3)
  const started = count < 0
  useEffect(() => {
    if (count < 0) return
    const skip = fxLevel() === 'off'
    const t = setTimeout(() => setCount((c) => (skip ? -1 : c - 1)), skip ? 0 : count === 0 ? 550 : 750)
    return () => clearTimeout(t)
  }, [count])

  // Timer
  useEffect(() => {
    if (!started) return
    startedAt.current = Date.now()
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [started])

  // Auto-submit when time runs out
  useEffect(() => {
    if (remaining === 0 && !result && !submittedRef.current) {
      toast.warning("Time's up! Submitting your answers…")
      submit()
    }
  }, [remaining, result, submit])

  // Warn before leaving mid-quest
  useEffect(() => {
    if (result) return
    const handler = (e: BeforeUnloadEvent) => {
      if (Object.keys(responses).length > 0) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [responses, result])

  const retry = () => {
    setResult(null)
    setResponses({})
    setIndex(0)
    submittedRef.current = false
    setElapsed(0)
    setCount(3)
    window.scrollTo({ top: 0 })
  }

  if (result) {
    return <ResultsView result={result} questions={questions} responses={responses} backHref={backHref} backLabel={backLabel} onRetry={allowRetry ? retry : undefined} isAssessment={isAssessment} />
  }

  const isLast = index === questions.length - 1
  const goNext = () => (isLast ? setConfirming(true) : setIndex((i) => i + 1))

  return (
    <div className="mx-auto max-w-3xl">
      {/* Countdown overlay */}
      {!started && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-arena/85 backdrop-blur-sm" role="status" aria-live="assertive">
          <div className="text-center">
            <p className="hud">{title}</p>
            <div className="relative mt-4 grid h-48 place-items-center">
              <span key={`b${count}`} aria-hidden="true" className="absolute size-40 rounded-full border-4 animate-burst" style={{ borderColor: count === 0 ? '#c4ff3d' : accent }} />
              <span key={count} className={cn('font-display text-[9rem] leading-none font-bold animate-count', count === 0 ? 'text-lime text-glow-lime' : 'text-white text-glow')}>
                {count === 0 ? 'GO!' : count}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">{questions.length} rounds{timeLimit ? ` · ${Math.round(timeLimit / 60)} min on the clock` : ''}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-14 z-20 -mx-4 mb-5 border-b border-line bg-arena/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:bg-panel/90 sm:px-5 sm:shadow-clay lg:top-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="hud truncate">{title}</p>
            <p className="font-display text-lg font-bold text-white uppercase">Round {index + 1} <span className="text-slate-400">/ {questions.length}</span></p>
          </div>
          <div className="flex items-center gap-2">
            {remaining !== null ? (
              <span className={cn('flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-sm font-bold', remaining <= 30 ? 'animate-pulse bg-hot/20 text-hot ring-1 ring-hot' : 'bg-indigo-100 text-indigo-800')} aria-live="polite" aria-label={`Time remaining ${formatDuration(remaining)}`}>
                <Clock className="size-4" aria-hidden="true" />{formatDuration(remaining)}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 font-mono text-sm font-semibold text-indigo-700">
                <Clock className="size-4" aria-hidden="true" />{formatDuration(elapsed)}
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-1" role="progressbar" aria-label="Quest progress" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index + 1}>
          {questions.map((x, i) => (
            <span key={x.id} className="h-1.5 flex-1 rounded-sm transition-all duration-300"
              style={i === index ? { background: accent, boxShadow: `0 0 10px ${accent}` } : isAnswered(x, responses[x.id]) ? { background: '#c4ff3d' } : { background: '#20244d' }} />
          ))}
        </div>
      </div>

      {/* Question */}
      <div key={q.id} className="card chamfer border-line-bright p-5 animate-rise sm:p-7">
        <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold">
          {q.topic && <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-indigo-800">{q.topic}</span>}
          {!isAssessment && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">{DIFFICULTY_LABEL[q.difficulty]} · {q.points} pts</span>}
        </div>
        <QuestionView question={q} response={responses[q.id]} onChange={(r) => setResponses((prev) => ({ ...prev, [q.id]: r }))} onEnter={goNext} />
      </div>

      {/* Navigator */}
      <nav aria-label="Question navigator" className="mt-5 flex flex-wrap justify-center gap-1.5">
        {questions.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Question ${i + 1}${isAnswered(x, responses[x.id]) ? ', answered' : ''}`}
            aria-current={i === index ? 'step' : undefined}
            className={cn(
              'grid size-9 place-items-center rounded-md font-display text-sm font-bold transition',
              i === index ? 'scale-110 bg-indigo-600 text-white shadow-glow' : isAnswered(x, responses[x.id]) ? 'bg-lime/15 text-lime ring-1 ring-lime/40' : 'bg-panel-2 text-slate-500 ring-1 ring-line hover:text-white',
            )}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      {/* Controls */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0 || pending}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Back
        </Button>
        <span className="hidden text-sm text-slate-500 sm:inline">{answeredCount} of {questions.length} answered</span>
        {isLast ? (
          <Button variant="accent" onClick={() => setConfirming(true)} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" aria-hidden="true" />} Finish
          </Button>
        ) : (
          <Button onClick={goNext} disabled={pending}>
            Next <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Confirm dialog */}
      {(confirming || pending) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="card chamfer w-full max-w-sm border-line-bright p-6 text-center animate-pop">
            {pending ? (
              <>
                <Loader2 className="mx-auto size-12 animate-spin text-lime" aria-hidden="true" />
                <p id="confirm-title" className="mt-3 font-display text-xl font-bold text-white uppercase">Calculating score…</p>
              </>
            ) : (
              <>
                <h2 id="confirm-title" className="text-2xl font-bold uppercase">Lock in answers?</h2>
                <p className="mt-2 text-slate-600">
                  You answered <strong>{answeredCount}</strong> of {questions.length} questions.
                  {answeredCount < questions.length && ' Unanswered questions count as wrong.'}
                  {isAssessment && ' This assessment can only be taken once.'}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setConfirming(false)}>Keep going</Button>
                  <Button variant="accent" onClick={submit}><Send className="size-4" aria-hidden="true" /> Submit</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
