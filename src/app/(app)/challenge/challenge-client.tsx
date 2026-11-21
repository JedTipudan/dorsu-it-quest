'use client'

import { useState, useTransition } from 'react'
import { Clock, Gauge, Loader2, Shuffle, Sparkles, Swords, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { SubjectIcon } from '@/components/game/bits'
import { QuestPlayer } from '@/components/game/quest-player'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/misc'
import { DIFFICULTY_LABEL } from '@/lib/gamification'
import type { Subject } from '@/lib/types'
import { cn, shuffle } from '@/lib/utils'
import { startChallenge, submitChallenge, type ChallengeStart } from '../actions'

export function ChallengeClient({ subjects, doneToday, initialSubject }: { subjects: Subject[]; doneToday: number; initialSubject: string | null }) {
  const [selected, setSelected] = useState<string | null>(initialSubject && subjects.some((s) => s.id === initialSubject) ? initialSubject : null)
  const [session, setSession] = useState<ChallengeStart | null>(null)
  const [pending, startTransition] = useTransition()

  const begin = () =>
    startTransition(async () => {
      const res = await startChallenge(selected)
      if (res.error || !res.data) {
        toast.error(res.error ?? 'Could not start the challenge.')
        return
      }
      const data = res.data
      setSession({
        ...data,
        questions: data.questions.map((q) => (q.kind === 'mcq' || q.kind === 'multi' || q.kind === 'order' ? { ...q, options: shuffle(q.options) } : q)),
      })
      window.scrollTo({ top: 0 })
    })

  if (session) {
    const subject = subjects.find((s) => s.id === selected)
    return (
      <QuestPlayer
        key={session.session_id}
        title={`Daily Challenge · ${subject?.name ?? 'Mixed subjects'}`}
        questions={session.questions}
        timeLimit={session.time_limit_seconds}
        accent={subject?.color ?? '#F97316'}
        backHref="/dashboard"
        backLabel="Back to dashboard"
        onSubmit={(responses, duration) => submitChallenge(session.session_id, responses, duration)}
      />
    )
  }

  const options = [{ id: null, name: 'Mixed', short_name: 'ALL', icon: 'zap', color: '#F97316', description: 'Questions from all four subjects' }, ...subjects]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {doneToday > 0 ? (
        <Alert tone="info">You already completed today&apos;s challenge — extra rounds are great practice and earn half XP. Come back tomorrow for another +30 XP bonus!</Alert>
      ) : (
        <Alert tone="success"><Sparkles className="mr-1 inline size-4 align-text-bottom" aria-hidden="true" /> Your daily +30 XP bonus is waiting. Keep your streak alive!</Alert>
      )}

      <section aria-labelledby="pick" className="card p-5 sm:p-6">
        <h2 id="pick" className="text-lg font-bold">Choose your arena</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Subject">
          {options.map((s) => {
            const active = selected === s.id
            return (
              <button
                key={s.id ?? 'mixed'}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(s.id)}
                className={cn('flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition', active ? 'border-indigo-600 bg-indigo-50' : 'border-indigo-100 hover:border-indigo-300')}
              >
                {s.id ? <SubjectIcon icon={s.icon} color={s.color} size="sm" /> : <span className="grid size-9 place-items-center rounded-xl bg-orange-500 text-white shadow-press"><Shuffle className="size-4.5" aria-hidden="true" /></span>}
                <span className="min-w-0">
                  <span className="block font-semibold">{s.name}</span>
                  <span className="block truncate text-xs text-slate-500">{s.id ? s.short_name : 'All subjects'}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Gauge, title: 'Adaptive', text: `Difficulty adapts to your accuracy: ${DIFFICULTY_LABEL.slice(1).join(' → ')}.` },
          { icon: Clock, title: '5 minutes', text: '30 seconds per question. Answers auto-submit when time runs out.' },
          { icon: Zap, title: '5 XP × difficulty', text: 'Per correct answer, plus +30 XP for your first round of the day.' },
        ].map((x) => (
          <div key={x.title} className="card p-4">
            <x.icon className="size-6 text-indigo-600" aria-hidden="true" />
            <p className="mt-2 font-bold">{x.title}</p>
            <p className="text-sm text-slate-600">{x.text}</p>
          </div>
        ))}
      </section>

      <div className="flex justify-center">
        <Button variant="accent" size="lg" onClick={begin} disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Swords className="size-5" aria-hidden="true" />}
          {pending ? 'Preparing your challenge…' : 'Start challenge'}
        </Button>
      </div>
    </div>
  )
}
