import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth'
import { blankQuestion, type ForgeQuest } from '@/lib/forge'
import type { QuestType, Subject } from '@/lib/types'
import { QuestForge } from '../../forge'

export const metadata: Metadata = { title: 'Forge a new quest' }

const TYPES: QuestType[] = ['quiz', 'simulation', 'challenge', 'pretest', 'posttest']

export default async function NewQuestPage({ searchParams }: { searchParams: Promise<{ subject?: string; type?: string }> }) {
  const { subject, type } = await searchParams
  const { supabase } = await requireStaff()
  const { data } = await supabase.from('subjects').select('*').order('sort_order')
  const subjects = (data ?? []) as Subject[]
  const questType: QuestType = TYPES.includes(type as QuestType) ? (type as QuestType) : 'quiz'

  const quest: ForgeQuest = {
    subject_id: subjects.some((s) => s.id === subject) ? subject! : subjects[0]?.id ?? '',
    title: '',
    description: '',
    type: questType,
    difficulty: questType === 'challenge' ? 2 : 1,
    xp_reward: questType === 'challenge' ? 150 : 80,
    time_limit_seconds: questType === 'challenge' ? 600 : null,
    is_published: false, // new quests start as drafts
  }

  return <QuestForge subjects={subjects} initialQuest={quest} initialQuestions={[blankQuestion('mcq')]} />
}
