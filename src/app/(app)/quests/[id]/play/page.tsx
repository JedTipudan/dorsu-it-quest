import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { isStaffRole, requireUser } from '@/lib/auth'
import { getSubjectsProgress, prepareForPlay } from '@/lib/data'
import type { Question } from '@/lib/types'
import { QuestPlayClient } from './play-client'

export const metadata: Metadata = { title: 'Playing quest' }
export const dynamic = 'force-dynamic'

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, profile } = await requireUser()
  const subjects = await getSubjectsProgress(supabase, profile.id, isStaffRole(profile.role))
  const subject = subjects.find((s) => s.quests.some((q) => q.id === id) || s.assessments.some((q) => q.id === id))
  const quest = subject && [...subject.quests, ...subject.assessments].find((q) => q.id === id)
  if (!subject || !quest) notFound()

  const isAssessment = quest.type === 'pretest' || quest.type === 'posttest'
  if (quest.status === 'locked' || (isAssessment && quest.status === 'passed')) redirect(`/quests/${id}`)

  const { data } = await supabase
    .from('questions')
    .select('id, kind, prompt, code, options, topic, difficulty, points, sort_order')
    .eq('quest_id', id)
    .order('sort_order')
  const questions = prepareForPlay((data ?? []) as Question[])
  if (questions.length === 0) redirect(`/quests/${id}`)

  return (
    <QuestPlayClient
      questId={quest.id}
      title={`${subject.short_name} · ${quest.title}`}
      questions={questions}
      timeLimit={quest.time_limit_seconds}
      isAssessment={isAssessment}
      subjectSlug={subject.slug}
      accent={subject.color}
    />
  )
}
