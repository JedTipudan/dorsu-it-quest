import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Quest, Question, Subject } from '@/lib/types'
import { num, shuffle } from '@/lib/utils'

export type QuestStatus = 'passed' | 'available' | 'locked'

export interface QuestWithStatus extends Quest {
  status: QuestStatus
  best: number | null
  attempts: number
  questionCount: number
}

export interface SubjectProgress extends Subject {
  quests: QuestWithStatus[]
  assessments: QuestWithStatus[]
  passed: number
  total: number
  percent: number
  next: QuestWithStatus | null
}

interface AttemptLite { quest_id: string | null; percent: number | string; passed: boolean }

const ASSESSMENT = new Set(['pretest', 'posttest'])

/** All subjects with their quest line, unlock state and the student's progress. */
export async function getSubjectsProgress(supabase: SupabaseClient, userId: string, unlockAll = false): Promise<SubjectProgress[]> {
  const [{ data: subjects }, { data: quests }, { data: attempts }, { data: counts }] = await Promise.all([
    supabase.from('subjects').select('*').order('sort_order'),
    supabase.from('quests').select('*').order('sort_order'),
    supabase.from('attempts').select('quest_id, percent, passed').eq('user_id', userId).not('quest_id', 'is', null),
    supabase.from('questions').select('quest_id'),
  ])

  const qCount = new Map<string, number>()
  for (const c of (counts ?? []) as { quest_id: string }[]) qCount.set(c.quest_id, (qCount.get(c.quest_id) ?? 0) + 1)

  const byQuest = new Map<string, { best: number; passed: boolean; attempts: number }>()
  for (const a of (attempts ?? []) as AttemptLite[]) {
    if (!a.quest_id) continue
    const prev = byQuest.get(a.quest_id) ?? { best: 0, passed: false, attempts: 0 }
    byQuest.set(a.quest_id, { best: Math.max(prev.best, num(a.percent)), passed: prev.passed || a.passed, attempts: prev.attempts + 1 })
  }

  return ((subjects ?? []) as Subject[]).map((s) => {
    const list = ((quests ?? []) as Quest[]).filter((q) => q.subject_id === s.id && (q.is_published || unlockAll))
    let prevPassed = true
    const line: QuestWithStatus[] = []
    const assessments: QuestWithStatus[] = []
    for (const q of list) {
      const st = byQuest.get(q.id)
      const base = { ...q, best: st ? st.best : null, attempts: st?.attempts ?? 0, questionCount: qCount.get(q.id) ?? 0 }
      if (ASSESSMENT.has(q.type)) {
        assessments.push({ ...base, status: st ? 'passed' : 'available' })
        continue
      }
      const status: QuestStatus = st?.passed ? 'passed' : prevPassed || unlockAll ? 'available' : 'locked'
      line.push({ ...base, status })
      prevPassed = Boolean(st?.passed)
    }
    const passed = line.filter((q) => q.status === 'passed').length
    return {
      ...s,
      quests: line,
      assessments,
      passed,
      total: line.length,
      percent: line.length ? Math.round((passed / line.length) * 100) : 0,
      next: line.find((q) => q.status === 'available') ?? null,
    }
  })
}

/** Questions for play: options shuffled server-side (no hydration mismatch, no answer leaks). */
export function prepareForPlay(questions: Question[]): Question[] {
  return questions.map((q) =>
    q.kind === 'mcq' || q.kind === 'multi' || q.kind === 'order' ? { ...q, options: shuffle(q.options ?? []) } : q,
  )
}
