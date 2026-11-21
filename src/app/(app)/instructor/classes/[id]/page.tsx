import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BarChart3, Download, GraduationCap, Target, TrendingUp, Users } from 'lucide-react'
import { CompletionChart, TrendChart } from '@/components/instructor/charts'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonClass } from '@/components/ui/button'
import { EmptyState, Pill, StatCard } from '@/components/ui/misc'
import { requireStaff } from '@/lib/auth'
import { QUEST_TYPE_LABEL } from '@/lib/gamification'
import { mean } from '@/lib/stats'
import type { ClassRow, QuestType } from '@/lib/types'
import { formatDate, num } from '@/lib/utils'
import { DeleteClassButton, EditClassForm, JoinCode, RemoveStudentButton } from '../class-forms'
import { PublishToggle } from '../../content/publish-toggle'

export const metadata: Metadata = { title: 'Class' }

interface QuestStat { quest_id: string; title: string; quest_type: QuestType; attempts: number; students_attempted: number; students_passed: number; members: number; completion_rate: number | null; avg_percent: number | null }
interface RosterRow { student_id: string; student_code: string; full_name: string; display_name: string; year_level: number | null; section: string | null; xp: number; level: number; streak: number; last_active_date: string | null; quests_passed: number; avg_percent: number | null; pretest: number | null; posttest: number | null }

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireStaff()
  const { data: cls } = await supabase.from('classes').select('*, subjects(name, color, slug)').eq('id', id).maybeSingle()
  if (!cls) notFound()
  const c = cls as ClassRow & { subjects: { name: string; color: string; slug: string } }

  const [{ data: stats }, { data: trend }, { data: roster }, { data: posttests }] = await Promise.all([
    supabase.rpc('class_quest_stats', { p_class: id }),
    supabase.rpc('class_performance_trend', { p_class: id }),
    supabase.rpc('class_roster', { p_class: id }),
    supabase.from('quests').select('id, title, is_published, type').eq('subject_id', c.subject_id).in('type', ['pretest', 'posttest']).order('type', { ascending: false }),
  ])

  const questStats = ((stats ?? []) as QuestStat[]).map((s) => ({ ...s, completion_rate: s.completion_rate === null ? null : num(s.completion_rate), avg_percent: s.avg_percent === null ? null : num(s.avg_percent) }))
  const line = questStats.filter((s) => s.quest_type !== 'pretest' && s.quest_type !== 'posttest')
  const students = (roster ?? []) as RosterRow[]
  const pre = students.map((s) => s.pretest).filter((v): v is number => v !== null).map(Number)
  const post = students.map((s) => s.posttest).filter((v): v is number => v !== null).map(Number)
  const completion = line.length ? mean(line.map((s) => s.completion_rate ?? 0)) : 0
  const avgScore = mean(students.map((s) => s.avg_percent).filter((v): v is number => v !== null).map(Number))

  return (
    <div className="space-y-6">
      <Link href="/instructor/classes" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Classes
      </Link>

      <header className="rounded-3xl p-6 text-white shadow-clay-lg sm:p-8" style={{ background: `linear-gradient(135deg, ${c.subjects.color}, #4338CA)` }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill className="bg-white/20 text-white">{c.subjects.name}</Pill>
              <Pill className="bg-white/20 text-white">{c.academic_year}</Pill>
              {c.group_type !== 'none' && <Pill className="bg-white/20 text-white capitalize">{c.group_type} group</Pill>}
            </div>
            <h1 className="mt-3 text-3xl font-bold">{c.name}</h1>
            <p className="mt-1 text-white/85">Students join from their Profile page using this code:</p>
          </div>
          <JoinCode classId={c.id} code={c.join_code} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Class summary">
        <StatCard label="Students" value={students.length} icon={Users} />
        <StatCard label="Avg completion" value={`${completion.toFixed(0)}%`} icon={Target} tone="emerald" />
        <StatCard label="Avg quest score" value={Number.isFinite(avgScore) ? `${avgScore.toFixed(1)}%` : '—'} icon={BarChart3} tone="violet" />
        <StatCard label="Pre → Post mean" value={`${pre.length ? mean(pre).toFixed(0) : '—'} → ${post.length ? mean(post).toFixed(0) : '—'}`} icon={TrendingUp} tone="orange" hint={`n = ${pre.length} / ${post.length}`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Quest completion rate</CardTitle></CardHeader>
          <CardBody><CompletionChart data={line.map((s) => ({ name: s.title, completion: s.completion_rate ?? 0, average: s.avg_percent }))} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Weekly average score</CardTitle></CardHeader>
          <CardBody>
            <TrendChart data={((trend ?? []) as { week: string; attempts: number; avg_percent: number }[]).map((t) => ({
              week: new Date(t.week + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
              average: num(t.avg_percent), attempts: num(t.attempts),
            }))} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Quest breakdown & item analysis</CardTitle></CardHeader>
        <CardBody className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Quest</th><th>Type</th><th className="text-right">Attempted</th><th className="text-right">Passed</th><th className="text-right">Completion</th><th className="text-right">Avg score</th><th /></tr></thead>
            <tbody>
              {questStats.map((s) => (
                <tr key={s.quest_id}>
                  <td className="font-semibold">{s.title}</td>
                  <td><Pill tone="slate">{QUEST_TYPE_LABEL[s.quest_type]}</Pill></td>
                  <td className="text-right">{s.students_attempted}/{s.members}</td>
                  <td className="text-right">{s.students_passed}</td>
                  <td className="text-right font-semibold">{s.completion_rate ?? 0}%</td>
                  <td className="text-right">{s.avg_percent === null ? '—' : `${s.avg_percent}%`}</td>
                  <td className="text-right"><Link href={`/instructor/content/quests/${s.quest_id}?class=${c.id}#items`} className="text-sm font-semibold whitespace-nowrap text-indigo-700 hover:underline">Item analysis</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roster & progress</CardTitle>
          <a href={`/instructor/classes/${c.id}/export`} className={buttonClass('outline', 'sm')}><Download className="size-4" aria-hidden="true" /> Export CSV</a>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          {students.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No students yet" description={`Share the join code ${c.join_code} with your class.`} />
          ) : (
            <table className="table-base">
              <thead><tr><th>Code</th><th>Student</th><th className="text-right">Level</th><th className="text-right">XP</th><th className="text-right">Quests</th><th className="text-right">Avg</th><th className="text-right">Pre</th><th className="text-right">Post</th><th>Last active</th><th /></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.student_id}>
                    <td className="font-mono text-xs">{s.student_code}</td>
                    <td><p className="font-semibold">{s.full_name || s.display_name}</p><p className="text-xs text-slate-500">{s.section ?? ''}</p></td>
                    <td className="text-right">{s.level}</td>
                    <td className="text-right">{s.xp}</td>
                    <td className="text-right">{s.quests_passed}/{line.length}</td>
                    <td className="text-right">{s.avg_percent === null ? '—' : `${num(s.avg_percent).toFixed(0)}%`}</td>
                    <td className="text-right">{s.pretest === null ? '—' : `${num(s.pretest).toFixed(0)}%`}</td>
                    <td className="text-right">{s.posttest === null ? '—' : `${num(s.posttest).toFixed(0)}%`}</td>
                    <td className="whitespace-nowrap">{formatDate(s.last_active_date)}</td>
                    <td><RemoveStudentButton classId={c.id} studentId={s.student_id} name={s.full_name || s.display_name} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Assessment controls</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-600">Open the posttest at the end of the review period. This applies to every class taking {c.subjects.name}.</p>
            {(posttests ?? []).map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-indigo-100 p-3">
                <span className="font-semibold">{q.title}</span>
                <PublishToggle questId={q.id} published={q.is_published} labels={['Closed', 'Open']} />
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Class settings</CardTitle></CardHeader>
          <CardBody className="space-y-6">
            <EditClassForm cls={c} />
            <div className="border-t border-indigo-50 pt-4"><DeleteClassButton classId={c.id} name={c.name} /></div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
