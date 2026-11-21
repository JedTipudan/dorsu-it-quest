'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, PartyPopper, RotateCcw, Sparkles, XCircle, Zap } from 'lucide-react'
import { CountUp } from '@/components/fx/count-up'
import { Button, LinkButton } from '@/components/ui/button'
import { BadgeMedal } from './bits'
import type { AttemptResult, Question, Response } from '@/lib/types'
import { cn, num } from '@/lib/utils'
import { rankTier, rankTitle } from '@/lib/gamification'
import { RankEmblem } from './rank-emblem'
import { fxLevel } from '@/lib/motion'

function describe(q: Question, r: { value?: string; values?: string[]; order?: string[]; accepted?: string[] } | undefined) {
  if (!r) return '—'
  const text = (id: string) => q.options.find((o) => o.id === id)?.text ?? id
  if (r.accepted) return r.accepted[0]
  if (r.values) return r.values.length ? r.values.map(text).join(', ') : '—'
  if (r.order) return r.order.map(text).join(' → ')
  if (r.value !== undefined) return q.kind === 'short' || q.kind === 'code' ? r.value || '—' : text(r.value)
  return '—'
}

async function celebrate() {
  if (fxLevel() !== 'full') return
  const confetti = (await import('canvas-confetti')).default
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.35 }, colors: ['#c4ff3d', '#8268ff', '#ffc53d', '#ff3d7f', '#2de2e6'] })
}

export function ResultsView({
  result, questions, responses, backHref, backLabel, onRetry, isAssessment,
}: {
  result: AttemptResult
  questions: Question[]
  responses: Record<string, Response>
  backHref: string
  backLabel: string
  onRetry?: () => void
  isAssessment: boolean
}) {
  const percent = num(result.percent)
  const leveledUp = result.level_after > result.level_before
  const win = result.passed
  const [showLevelUp, setShowLevelUp] = useState(leveledUp)
  const oldTier = rankTier(result.level_before)
  const newTier = rankTier(result.level_after)
  // Start the ring empty and fill it after mount so the animation plays.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(percent))
    return () => cancelAnimationFrame(t)
  }, [percent])

  useEffect(() => {
    if (result.passed || leveledUp || result.new_badges.length) celebrate()
  }, [result, leveledUp])

  const resultById = new Map(result.results.map((r) => [r.question_id, r]))
  const ring = 2 * Math.PI * 52
  const tone = percent >= 80 ? 'text-lime' : percent >= 60 ? 'text-cyan' : 'text-hot'

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Full-screen level-up moment */}
      {showLevelUp && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-black/85 p-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="lvl-h" onClick={() => setShowLevelUp(false)}>
          <div aria-hidden="true" className="arena-floor opacity-70" />
          <div aria-hidden="true" className="absolute size-[36rem] rounded-full opacity-40 blur-3xl animate-glow" style={{ background: newTier.glow }} />
          <div className="relative text-center">
            <span aria-hidden="true" className="absolute top-16 left-1/2 size-48 -translate-x-1/2 rounded-full border-4 animate-burst" style={{ borderColor: newTier.from }} />
            <RankEmblem level={result.level_after} size="xl" animated className="animate-pop" />
            <h2 id="lvl-h" className="mt-6 text-6xl font-bold text-white uppercase text-glow animate-slam sm:text-7xl">Level up!</h2>
            <p className="mt-2 font-display text-xl text-slate-700 uppercase">
              LV {result.level_before} <span className="text-lime">→</span> LV {result.level_after} · {rankTitle(result.level_after)}
            </p>
            {newTier.name !== oldTier.name && (
              <p className="chamfer-sm mx-auto mt-5 w-fit px-5 py-2 font-display text-lg font-bold uppercase animate-pop [animation-delay:400ms]"
                style={{ background: `linear-gradient(90deg, ${newTier.from}, ${newTier.to})`, color: '#070818' }}>
                New rank unlocked: {newTier.name}
              </p>
            )}
            <button type="button" onClick={() => setShowLevelUp(false)} className="chamfer mt-8 bg-lime px-8 py-3 font-display font-bold text-lime-ink uppercase shadow-glow-lime">
              Continue
            </button>
          </div>
        </div>
      )}
      <section className="card chamfer relative isolate overflow-hidden border-line-bright text-center animate-pop">
        <div aria-hidden="true" className="arena-floor -z-10 opacity-60" />
        <div aria-hidden="true" className={cn('absolute top-0 left-1/2 -z-10 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl', win ? 'bg-lime/25' : 'bg-hot/20')} />
        <div className="px-6 pt-9 pb-4">
          <p className="hud">{isAssessment ? 'Assessment submitted' : result.passed ? 'Quest cleared' : 'Quest attempted'}</p>
          <h1 className={cn('mt-2 text-5xl font-bold uppercase animate-slam sm:text-7xl', isAssessment ? 'text-white' : win ? 'text-lime text-glow-lime' : 'text-hot')}>
            {isAssessment ? 'Locked in' : percent === 100 ? 'Flawless' : result.passed ? 'Victory' : 'Defeat'}
          </h1>
          <p className="mt-1 font-display text-slate-600 uppercase">
            {isAssessment ? 'Thank you, your answers are saved' : percent === 100 ? 'Perfect run, every answer correct' : result.passed ? 'Great job, player' : 'Close, but not yet. Run it back!'}
          </p>
        </div>
        <div className="px-6 pb-8">
          <div className="relative mx-auto size-36">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-slate-100" />
              <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round" className={cn('stroke-current transition-[stroke-dashoffset] duration-[1600ms] ease-out', tone)}
                style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
                strokeDasharray={ring} strokeDashoffset={ring * (1 - shown / 100)} />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display text-4xl font-bold text-white"><CountUp value={Math.round(percent)} duration={1600} suffix="%" /></span>
            </div>
          </div>
          <p className="mt-3 text-slate-600">
            <strong className="text-white">{result.correct}</strong> of {result.total} correct · {result.score}/{result.max_score} points
          </p>

          <div className="stagger mt-5 flex flex-wrap justify-center gap-3">
            <span className="chamfer-sm flex items-center gap-2 bg-gold px-5 py-2.5 font-display text-xl font-bold text-[#2a1a00] shadow-[0_0_30px_-6px_#ffc53d]">
              <Zap className="size-5" aria-hidden="true" /> +<CountUp value={result.xp_earned} duration={1400} /> XP
            </span>
            {result.daily_bonus && (
              <span className="chamfer-sm flex items-center gap-2 bg-emerald-100 px-4 py-2.5 font-display font-semibold text-emerald-800 uppercase">
                <Sparkles className="size-5" aria-hidden="true" /> Daily bonus +30
              </span>
            )}
            {leveledUp && (
              <span className="chamfer-sm flex items-center gap-2 bg-indigo-600 px-4 py-2.5 font-display font-semibold text-white uppercase shadow-glow animate-pop">
                <PartyPopper className="size-5" aria-hidden="true" /> Level up! Lv {result.level_after} · {rankTitle(result.level_after)}
              </span>
            )}
          </div>
          {!isAssessment && result.xp_earned === 0 && (
            <p className="mt-3 text-sm text-slate-500">Replays only earn XP when you beat your personal best.</p>
          )}

          {result.new_badges.length > 0 && (
            <div className="mt-6 rounded-lg border border-gold/30 bg-gold/10 p-5">
              <p className="font-display text-lg font-bold text-gold uppercase">New badge{result.new_badges.length > 1 ? 's' : ''} unlocked!</p>
              <div className="mt-3 flex flex-wrap justify-center gap-4">
                {result.new_badges.map((b) => (
                  <div key={b.code} className="flex w-28 flex-col items-center animate-slam">
                    <BadgeMedal icon={b.icon} tier={b.tier} />
                    <p className="mt-2 text-sm font-bold">{b.name}</p>
                    <p className="text-xs text-slate-600">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <LinkButton href={backHref} variant={win ? 'accent' : 'primary'}>{backLabel}</LinkButton>
            {onRetry && !isAssessment && (
              <Button variant="outline" onClick={onRetry}><RotateCcw className="size-4" aria-hidden="true" /> Try again</Button>
            )}
          </div>
        </div>
      </section>

      {isAssessment ? (
        <p className="card p-5 text-center text-sm text-slate-600">
          To keep the assessment valid, correct answers are not shown. Your instructor will discuss the results with the class.
        </p>
      ) : (
        <section aria-labelledby="review-title">
          <h2 id="review-title" className="mb-3 text-xl font-bold">Review your answers</h2>
          <ol className="space-y-3">
            {questions.map((q, i) => {
              const r = resultById.get(q.id)
              const correct = r?.is_correct
              return (
                <li key={q.id}>
                  <details className={cn('card group overflow-hidden', correct ? 'border-emerald-200' : 'border-red-200')} open={!correct}>
                    <summary className="flex list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
                      {correct ? <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-500" aria-label="Correct" /> : <XCircle className="mt-0.5 size-6 shrink-0 text-red-500" aria-label="Incorrect" />}
                      <span className="flex-1 font-semibold">{i + 1}. {q.prompt}</span>
                      <ChevronDown className="mt-0.5 size-5 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="space-y-3 border-t border-indigo-50 px-4 pt-3 pb-4 text-sm">
                      {q.code && <pre className="code-block text-xs"><code>{q.code}</code></pre>}
                      <p><span className="font-semibold text-slate-500">Your answer: </span><span className={correct ? 'text-emerald-700' : 'text-red-700'}>{describe(q, responses[q.id])}</span></p>
                      {!correct && r && <p><span className="font-semibold text-slate-500">Correct answer: </span><span className="font-semibold text-emerald-700">{describe(q, r.answer)}</span></p>}
                      {r?.explanation && <p className="rounded-xl bg-indigo-50 p-3 text-indigo-900"><span className="font-semibold">Why: </span>{r.explanation}</p>}
                    </div>
                  </details>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}
