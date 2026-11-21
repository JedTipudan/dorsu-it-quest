import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ClipboardCheck, Clock, Crown, FlaskConical, HelpCircle, Lock, Play, Swords, Zap } from 'lucide-react'
import { SubjectIcon } from '@/components/game/bits'
import { LinkButton } from '@/components/ui/button'
import { Pill, Progress } from '@/components/ui/misc'
import { isStaffRole, requireUser } from '@/lib/auth'
import { getSubjectsProgress, type QuestWithStatus } from '@/lib/data'
import { DIFFICULTY_LABEL, QUEST_TYPE_LABEL } from '@/lib/gamification'
import { cn } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }
}

const TYPE_ICON = { quiz: HelpCircle, simulation: FlaskConical, challenge: Crown, pretest: ClipboardCheck, posttest: ClipboardCheck }

function QuestNode({ q, index, color, isLast }: { q: QuestWithStatus; index: number; color: string; isLast: boolean }) {
  const Icon = TYPE_ICON[q.type]
  const locked = q.status === 'locked'
  const passed = q.status === 'passed'
  const current = q.status === 'available'
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {/* Path to the next level: glowing once cleared, dashed while still locked ahead */}
      {!isLast && (
        <span aria-hidden="true" className={cn('absolute top-16 left-8 h-[calc(100%-4rem)] w-1 -translate-x-1/2 rounded-full', !passed && 'bg-[repeating-linear-gradient(to_bottom,#2a2f72_0_6px,transparent_6px_12px)]')}
          style={passed ? { background: color, boxShadow: `0 0 12px ${color}` } : undefined} />
      )}
      <div className="relative z-10 flex shrink-0 flex-col items-center">
        {current && <span aria-hidden="true" className="absolute inset-0 -m-2 rounded-full opacity-60 blur-md animate-glow" style={{ background: color }} />}
        <span
          className={cn('chamfer relative grid size-16 place-items-center shadow-press transition', locked ? 'bg-panel-2 text-slate-400 ring-1 ring-line ring-inset' : 'text-arena')}
          style={locked ? undefined : { background: passed ? `linear-gradient(135deg, ${color}, ${color}aa)` : color, boxShadow: `0 0 24px -4px ${color}` }}
        >
          {locked ? <Lock className="size-6" aria-hidden="true" /> : passed ? <CheckCircle2 className="size-8" aria-hidden="true" /> : <Icon className="size-7" aria-hidden="true" />}
        </span>
        <span className="mt-1 font-mono text-[10px] font-bold text-slate-500">LV {index + 1}</span>
      </div>
      <div className={cn('card card-hover flex-1 p-4 sm:p-5', locked && 'opacity-60 saturate-50')}
        style={current ? { borderColor: color, boxShadow: `0 0 0 1px ${color}66, 0 0 32px -10px ${color}` } : undefined}>
        <div className="flex flex-wrap items-center gap-2">
          {current && <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-arena uppercase animate-pulse" style={{ background: color }}>▶ Next up</span>}
          {passed && <span className="rounded bg-lime/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-lime uppercase">Cleared</span>}
          <span className="hud">Level {index + 1}</span>
          <Pill tone={q.type === 'challenge' ? 'orange' : q.type === 'simulation' ? 'sky' : 'indigo'}>{QUEST_TYPE_LABEL[q.type]}</Pill>
          <Pill tone="slate">{DIFFICULTY_LABEL[q.difficulty]}</Pill>
          {!q.is_published && <Pill tone="amber">Draft</Pill>}
        </div>
        <h3 className="mt-1.5 text-xl font-bold uppercase">{q.title}</h3>
        <p className="mt-0.5 text-sm text-slate-600">{q.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="flex items-center gap-1"><HelpCircle className="size-4" aria-hidden="true" />{q.questionCount} questions</span>
          <span className="flex items-center gap-1 font-semibold text-gold"><Zap className="size-4" aria-hidden="true" />{q.xp_reward} XP</span>
          {q.time_limit_seconds && <span className="flex items-center gap-1"><Clock className="size-4" aria-hidden="true" />{Math.round(q.time_limit_seconds / 60)} min</span>}
          {q.best !== null && <span className="font-semibold text-indigo-700">Best: {Math.round(q.best)}%</span>}
        </div>
        <div className="mt-4">
          {locked ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-500"><Lock className="size-4" aria-hidden="true" /> Pass the previous quest to unlock</p>
          ) : (
            <LinkButton href={`/quests/${q.id}`} variant={passed ? 'outline' : 'accent'} size="sm" className={cn(current && 'shine')}>
              {passed ? 'Replay' : q.attempts ? 'Try again' : 'Play'} <Play className="size-3.5" aria-hidden="true" />
            </LinkButton>
          )}
        </div>
      </div>
    </li>
  )
}

export default async function SubjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { supabase, profile } = await requireUser()
  const subjects = await getSubjectsProgress(supabase, profile.id, isStaffRole(profile.role))
  const s = subjects.find((x) => x.slug === slug)
  if (!s) notFound()

  return (
    <div className="space-y-6">
      <Link href="/subjects" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> All subjects
      </Link>

      <header className="card chamfer relative isolate overflow-hidden">
        <div aria-hidden="true" className="arena-floor -z-10 opacity-40" />
        <div aria-hidden="true" className="absolute -top-20 -left-10 -z-10 size-72 rounded-full opacity-30 blur-3xl" style={{ background: s.color }} />
        <div className="h-1" style={{ background: s.color, boxShadow: `0 0 16px ${s.color}` }} />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <SubjectIcon icon={s.icon} color={s.color} size="lg" />
          <div className="flex-1">
            <p className="hud hud-tick">World</p>
            <h1 className="text-3xl font-bold uppercase sm:text-4xl">{s.name}</h1>
            <p className="mt-1 text-slate-600">{s.description}</p>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={s.percent} color={s.color} className="max-w-xs" label="Subject progress" />
              <span className="text-sm font-bold whitespace-nowrap">{s.passed}/{s.total} passed</span>
            </div>
          </div>
          <LinkButton href={`/challenge?subject=${s.id}`} variant="accent" className="self-start sm:self-center">
            <Swords className="size-4" aria-hidden="true" /> Subject challenge
          </LinkButton>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="questline">
          <h2 id="questline" className="mb-5 text-2xl font-bold uppercase">Level map</h2>
          {s.quests.length === 0 ? (
            <p className="card p-6 text-slate-600">No quests published for this subject yet.</p>
          ) : (
            <ol>{s.quests.map((q, i) => <QuestNode key={q.id} q={q} index={i} color={s.color} isLast={i === s.quests.length - 1} />)}</ol>
          )}
        </section>

        <aside aria-labelledby="assess" className="space-y-4">
          <h2 id="assess" className="text-xl font-bold">Assessments</h2>
          <p className="text-sm text-slate-600">Take the pretest once before the quests and the posttest at the end of the review period. They measure your learning gain.</p>
          {s.assessments.length === 0 && <p className="card p-4 text-sm text-slate-600">No open assessments right now.</p>}
          {s.assessments.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="size-5 text-violet-600" aria-hidden="true" />
                <h3 className="font-bold">{a.title}</h3>
                {!a.is_published && <Pill tone="amber">Closed</Pill>}
              </div>
              <p className="mt-1 text-sm text-slate-600">{a.questionCount} items · {a.time_limit_seconds ? `${Math.round(a.time_limit_seconds / 60)} min` : 'untimed'}</p>
              <div className="mt-3">
                {a.status === 'passed' ? (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" /> Completed</p>
                ) : (
                  <LinkButton href={`/quests/${a.id}`} variant="secondary" size="sm">Take {a.type === 'pretest' ? 'pretest' : 'posttest'}</LinkButton>
                )}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}
