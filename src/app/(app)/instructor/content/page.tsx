import type { Metadata } from 'next'
import Link from 'next/link'
import { ClipboardCheck, Clock, Crown, FlaskConical, Hammer, HelpCircle, Plus, ShieldCheck, Zap, type LucideIcon } from 'lucide-react'
import { SubjectIcon } from '@/components/game/bits'
import { LinkButton } from '@/components/ui/button'
import { PageHeader, Pill } from '@/components/ui/misc'
import { requireStaff } from '@/lib/auth'
import { DIFFICULTY_LABEL, QUEST_TYPE_LABEL } from '@/lib/gamification'
import type { Quest, QuestType, Subject } from '@/lib/types'
import { PublishToggle } from './publish-toggle'
import { interpret } from '@/lib/validation'

export const metadata: Metadata = { title: 'Quest Forge' }

const TYPE_ICON: Record<QuestType, LucideIcon> = { quiz: HelpCircle, simulation: FlaskConical, challenge: Crown, pretest: ClipboardCheck, posttest: ClipboardCheck }

const STARTERS: { type: QuestType; title: string; text: string; icon: LucideIcon; color: string }[] = [
  { type: 'quiz', title: 'Quiz', text: 'Classic question round', icon: HelpCircle, color: '#8268ff' },
  { type: 'simulation', title: 'Simulation', text: 'Ordering & hands-on steps', icon: FlaskConical, color: '#2de2e6' },
  { type: 'challenge', title: 'Boss fight', text: 'Timed, harder, more XP', icon: Crown, color: '#ff3d7f' },
  { type: 'pretest', title: 'Assessment', text: 'Pre/posttest for research', icon: ClipboardCheck, color: '#ffc53d' },
]

export default async function ForgeLibraryPage() {
  const { supabase } = await requireStaff()
  const [{ data: subjects }, { data: quests }, { data: qs }, { data: reviews }] = await Promise.all([
    supabase.from('subjects').select('*').order('sort_order'),
    supabase.from('quests').select('*').order('sort_order'),
    supabase.from('questions').select('quest_id').limit(10000),
    supabase.from('quest_reviews').select('quest_id, accuracy, alignment, difficulty_fit, technical'), // null if upgrade not run
  ])
  // Expert-validation mean per quest (average of the 4 rubric criteria across raters).
  const rating = new Map<string, { sum: number; n: number }>()
  for (const r of (reviews ?? []) as { quest_id: string; accuracy: number; alignment: number; difficulty_fit: number; technical: number }[]) {
    const cur = rating.get(r.quest_id) ?? { sum: 0, n: 0 }
    rating.set(r.quest_id, { sum: cur.sum + (r.accuracy + r.alignment + r.difficulty_fit + r.technical) / 4, n: cur.n + 1 })
  }
  const counts = new Map<string, number>()
  for (const q of (qs ?? []) as { quest_id: string }[]) counts.set(q.quest_id, (counts.get(q.quest_id) ?? 0) + 1)
  const all = (quests ?? []) as Quest[]

  return (
    <>
      <PageHeader
        title="Quest Forge"
        description="Build quizzes, simulations, boss fights and assessments. Everything you publish appears for students right away."
        icon={Hammer}
        actions={<LinkButton href="/instructor/content/quests/new" variant="accent" className="shine"><Plus className="size-4" aria-hidden="true" /> Forge new quest</LinkButton>}
      />

      {/* Quick start */}
      <section aria-label="Quick start" className="stagger mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STARTERS.map((s) => (
          <Link key={s.type} href={`/instructor/content/quests/new?type=${s.type}`} className="group card card-hover chamfer overflow-hidden p-4">
            <div aria-hidden="true" className="absolute -top-10 -right-10 size-28 rounded-full opacity-25 blur-2xl transition group-hover:opacity-60" style={{ background: s.color }} />
            <span className="chamfer-sm relative grid size-11 place-items-center text-arena transition group-hover:scale-110 group-hover:-rotate-6" style={{ background: s.color }}>
              <s.icon className="size-5" aria-hidden="true" />
            </span>
            <p className="relative mt-3 font-display text-lg font-bold text-white uppercase">New {s.title}</p>
            <p className="relative text-sm text-slate-600">{s.text}</p>
          </Link>
        ))}
      </section>

      <div className="space-y-8">
        {((subjects ?? []) as Subject[]).map((s) => {
          const list = all.filter((q) => q.subject_id === s.id)
          return (
            <section key={s.id} aria-labelledby={`sub-${s.id}`}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <SubjectIcon icon={s.icon} color={s.color} size="sm" />
                <h2 id={`sub-${s.id}`} className="flex-1 text-xl font-bold uppercase">{s.name} <span className="text-slate-400">· {list.length}</span></h2>
                <LinkButton href={`/instructor/content/quests/new?subject=${s.id}`} variant="outline" size="sm"><Plus className="size-4" aria-hidden="true" /> Add</LinkButton>
              </div>
              {list.length === 0 ? (
                <p className="card p-5 text-sm text-slate-600">No quests yet. Forge the first one for this world.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((q) => {
                    const Icon = TYPE_ICON[q.type]
                    return (
                      <li key={q.id} className="card card-hover group relative flex flex-col overflow-hidden p-4">
                        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5" style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }} />
                        <div className="flex items-start gap-3">
                          <span className="chamfer-sm grid size-10 shrink-0 place-items-center bg-indigo-100 text-indigo-700"><Icon className="size-5" aria-hidden="true" /></span>
                          <div className="min-w-0 flex-1">
                            <Link href={`/instructor/content/quests/${q.id}`} className="line-clamp-2 font-display font-bold text-white uppercase after:absolute after:inset-0 hover:text-lime">
                              {q.title}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Pill tone={q.type === 'pretest' || q.type === 'posttest' ? 'violet' : q.type === 'challenge' ? 'red' : 'slate'}>{QUEST_TYPE_LABEL[q.type]}</Pill>
                              <Pill tone="slate">{DIFFICULTY_LABEL[q.difficulty]}</Pill>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-slate-500">
                          <span className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><HelpCircle className="size-3.5" aria-hidden="true" />{counts.get(q.id) ?? 0}</span>
                            <span className="flex items-center gap-1 text-gold"><Zap className="size-3.5" aria-hidden="true" />{q.xp_reward}</span>
                            {q.time_limit_seconds && <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{Math.round(q.time_limit_seconds / 60)}m</span>}
                            {(() => {
                              const r = rating.get(q.id)
                              if (!r) return null
                              const mean = r.sum / r.n
                              return <span className="flex items-center gap-1" style={{ color: interpret(mean).color }} title={`Expert validation: ${mean.toFixed(2)} (${interpret(mean).label}) from ${r.n} rater(s)`}><ShieldCheck className="size-3.5" aria-hidden="true" />{mean.toFixed(1)}</span>
                            })()}
                          </span>
                          {/* relative z-10 keeps the toggle clickable above the card-wide link */}
                          <span className="relative z-10"><PublishToggle questId={q.id} published={q.is_published} /></span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}
