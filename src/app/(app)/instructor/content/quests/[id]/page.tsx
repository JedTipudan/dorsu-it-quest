import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'
import { requireStaff } from '@/lib/auth'
import { KIND_LABEL } from '@/lib/question-format'
import { difficultyLabel } from '@/lib/stats'
import type { Quest, QuestionKind, Subject } from '@/lib/types'
import { num } from '@/lib/utils'
import { fromDb } from '@/lib/forge'
import type { Question } from '@/lib/types'
import { QuestForge } from '../../forge'
import { QuestReview, type Review } from '../../quest-review'

type EditableQuestion = Question & { answer: Record<string, unknown> | null; explanation: string }

export const metadata: Metadata = { title: 'Edit quest' }

export default async function EditQuestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ class?: string }> }) {
  const { id } = await params
  const { class: classId } = await searchParams
  const { supabase, profile } = await requireStaff()

  const { data: quest } = await supabase.from('quests').select('*').eq('id', id).maybeSingle()
  if (!quest) notFound()

  const [{ data: subjects }, { data: questions }, { data: items }, { data: classes }, reviewsRes] = await Promise.all([
    supabase.from('subjects').select('*').order('sort_order'),
    supabase.from('questions').select('*, question_keys(answer, explanation)').eq('quest_id', id).order('sort_order'),
    supabase.rpc('item_analysis', { p_quest: id, p_class: classId || null }),
    (profile.role === 'admin' ? supabase.from('classes').select('id, name') : supabase.from('classes').select('id, name').eq('instructor_id', profile.id)),
    supabase.from('quest_reviews').select('*, profiles(display_name, full_name)').eq('quest_id', id),
  ])

  type QRow = Omit<EditableQuestion, 'answer' | 'explanation'> & { question_keys: { answer: Record<string, unknown>; explanation: string } | null }
  const list: EditableQuestion[] = ((questions ?? []) as QRow[]).map(({ question_keys, ...q }) => ({
    ...q, answer: question_keys?.answer ?? null, explanation: question_keys?.explanation ?? '',
  }))
  const q = quest as Quest
  type Item = { question_id: string; sort_order: number; prompt: string; kind: QuestionKind; responses: number; correct: number; p_value: number | null }
  const analysis = (items ?? []) as Item[]
  const totalResponses = analysis.reduce((a, i) => a + num(i.responses), 0)

  return (
    <div className="space-y-8">
      <QuestForge
        subjects={(subjects ?? []) as Subject[]}
        initialQuest={{
          id: q.id, subject_id: q.subject_id, title: q.title, description: q.description, type: q.type,
          difficulty: q.difficulty, xp_reward: q.xp_reward, time_limit_seconds: q.time_limit_seconds, is_published: q.is_published,
        }}
        initialQuestions={list.map((x) => fromDb(x, x.answer))}
      />

      <QuestReview questId={q.id} reviews={(reviewsRes.data ?? []) as Review[]} myId={profile.id} unavailable={Boolean(reviewsRes.error)} />

      <div className="max-w-3xl">
          <Card id="items" className="scroll-mt-20">
            <CardHeader><CardTitle>Item analysis · how players did</CardTitle></CardHeader>
            <CardBody>
              <form className="mb-4 flex gap-2" action={`/instructor/content/quests/${q.id}#items`}>
                <label htmlFor="class-filter" className="sr-only">Filter by class</label>
                <select id="class-filter" name="class" defaultValue={classId ?? ''} className="h-10 flex-1 rounded-xl border-2 border-indigo-100 bg-panel px-3 text-sm">
                  <option value="">All students</option>
                  {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="submit" className="h-10 rounded-xl bg-indigo-100 px-4 text-sm font-semibold text-indigo-800 hover:bg-indigo-200">Apply</button>
              </form>
              <p className="mb-3 text-xs text-slate-500">Difficulty index p = proportion of correct responses. Items below 0.20 may need review or re-teaching.</p>
              {totalResponses === 0 ? (
                <p className="text-sm text-slate-600">No responses yet.</p>
              ) : (
                <ol className="space-y-3">
                  {analysis.map((it, i) => {
                    const p = it.p_value === null ? null : num(it.p_value)
                    return (
                      <li key={it.question_id}>
                        <div className="flex items-start justify-between gap-2 text-sm">
                          <span className="line-clamp-2 font-medium"><span className="text-slate-400">{i + 1}.</span> {it.prompt}</span>
                          <span className="shrink-0 font-mono font-bold">{p === null ? '—' : p.toFixed(2)}</span>
                        </div>
                        <Progress value={(p ?? 0) * 100} className="mt-1 h-2" barClassName={p !== null && p <= 0.2 ? 'from-red-500 to-orange-500' : p !== null && p <= 0.4 ? 'from-amber-400 to-orange-400' : undefined} label={`Item ${i + 1} difficulty`} />
                        <p className="mt-0.5 text-xs text-slate-500">{p === null ? 'No responses' : difficultyLabel(p)} · {num(it.correct)}/{num(it.responses)} correct · {KIND_LABEL[it.kind]}</p>
                      </li>
                    )
                  })}
                </ol>
              )}
            </CardBody>
          </Card>
      </div>
    </div>
  )
}
