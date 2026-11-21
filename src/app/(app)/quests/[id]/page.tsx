import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock, Gauge, HelpCircle, Info, Lock, Play, Trophy, Zap } from 'lucide-react'
import { SubjectIcon } from '@/components/game/bits'
import { LinkButton } from '@/components/ui/button'
import { Alert, Pill } from '@/components/ui/misc'
import { isStaffRole, requireUser } from '@/lib/auth'
import { getSubjectsProgress } from '@/lib/data'
import { DIFFICULTY_LABEL, PASSING_PERCENT, QUEST_TYPE_LABEL } from '@/lib/gamification'
import { formatDateTime, formatDuration, num } from '@/lib/utils'

export const metadata: Metadata = { title: 'Quest' }

export default async function QuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, profile } = await requireUser()
  const staff = isStaffRole(profile.role)
  const subjects = await getSubjectsProgress(supabase, profile.id, staff)
  const subject = subjects.find((s) => s.quests.some((q) => q.id === id) || s.assessments.some((q) => q.id === id))
  const quest = subject && [...subject.quests, ...subject.assessments].find((q) => q.id === id)
  if (!subject || !quest) notFound()

  const { data: attempts } = await supabase.from('attempts').select('id, percent, passed, xp_earned, duration_seconds, created_at')
    .eq('user_id', profile.id).eq('quest_id', id).order('created_at', { ascending: false }).limit(10)

  const isAssessment = quest.type === 'pretest' || quest.type === 'posttest'
  const assessmentDone = isAssessment && (attempts?.length ?? 0) > 0
  const locked = quest.status === 'locked'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/subjects/${subject.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> {subject.name}
      </Link>

      <section className="card overflow-hidden">
        <div className="relative p-6 text-white sm:p-8" style={{ background: `linear-gradient(135deg, ${subject.color}, #4338CA)` }}>
          <div className="flex items-center gap-2">
            <Pill className="bg-white/20 text-white">{QUEST_TYPE_LABEL[quest.type]}</Pill>
            {!isAssessment && <Pill className="bg-white/20 text-white">{DIFFICULTY_LABEL[quest.difficulty]}</Pill>}
          </div>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{quest.title}</h1>
          <p className="mt-2 max-w-xl text-white/90">{quest.description}</p>
          <div className="absolute top-6 right-6 hidden sm:block"><SubjectIcon icon={subject.icon} color="rgb(255 255 255 / 0.2)" size="lg" /></div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-indigo-100 sm:grid-cols-4">
          {[
            { icon: HelpCircle, label: 'Questions', value: quest.questionCount },
            { icon: Zap, label: 'Max XP', value: isAssessment ? '20' : quest.xp_reward + 25 },
            { icon: Clock, label: 'Time limit', value: quest.time_limit_seconds ? `${Math.round(quest.time_limit_seconds / 60)} min` : 'None' },
            { icon: Gauge, label: 'To pass', value: isAssessment ? '—' : `${PASSING_PERCENT}%` },
          ].map((s) => (
            <div key={s.label} className="bg-panel p-4 text-center">
              <s.icon className="mx-auto size-5 text-indigo-500" aria-hidden="true" />
              <p className="mt-1 font-display text-xl font-bold">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4 p-6">
          {isAssessment ? (
            <Alert tone="info">
              <Info className="mr-1 inline size-4 align-text-bottom" aria-hidden="true" />
              This is a research assessment. You can take it <strong>only once</strong>, and correct answers are not shown afterwards. Answer honestly — it does not affect your grade.
            </Alert>
          ) : (
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 translate-y-0.5 text-emerald-500" aria-hidden="true" />Instant feedback with explanations after you submit.</li>
              <li className="flex gap-2"><Trophy className="size-4 shrink-0 translate-y-0.5 text-amber-500" aria-hidden="true" />+25 XP bonus for a perfect score{quest.time_limit_seconds ? ', +15 XP for finishing in under half the time' : ''}.</li>
              <li className="flex gap-2"><Zap className="size-4 shrink-0 translate-y-0.5 text-orange-500" aria-hidden="true" />Replays earn XP only when you beat your best score.</li>
            </ul>
          )}

          {quest.questionCount === 0 ? (
            <Alert tone="warning">This quest has no questions yet.</Alert>
          ) : locked ? (
            <p className="flex items-center gap-2 font-semibold text-slate-500"><Lock className="size-5" aria-hidden="true" /> Pass the previous quest to unlock this one.</p>
          ) : assessmentDone ? (
            <Alert tone="success">You completed this assessment. Thank you!</Alert>
          ) : (
            <LinkButton href={`/quests/${quest.id}/play`} variant="accent" size="lg" className="w-full sm:w-auto" prefetch={false}>
              <Play className="size-5" aria-hidden="true" /> {quest.attempts ? 'Play again' : isAssessment ? 'Begin assessment' : 'Start quest'}
            </LinkButton>
          )}
        </div>
      </section>

      {!isAssessment && (attempts?.length ?? 0) > 0 && (
        <section className="card p-5 sm:p-6" aria-labelledby="history">
          <h2 id="history" className="text-lg font-bold">Your attempts</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Date</th><th>Score</th><th>Result</th><th>Time</th><th className="text-right">XP</th></tr></thead>
              <tbody>
                {(attempts ?? []).map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                    <td className="font-semibold">{Math.round(num(a.percent))}%</td>
                    <td>{a.passed ? <Pill tone="emerald">Passed</Pill> : <Pill tone="orange">Retry</Pill>}</td>
                    <td className="font-mono">{formatDuration(a.duration_seconds)}</td>
                    <td className="text-right font-bold text-orange-600">+{a.xp_earned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
