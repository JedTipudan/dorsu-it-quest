'use client'

import { QuestPlayer } from '@/components/game/quest-player'
import type { Question, Response } from '@/lib/types'
import { submitQuestAttempt } from '../../../actions'

export function QuestPlayClient({
  questId, title, questions, timeLimit, isAssessment, subjectSlug, accent,
}: {
  questId: string
  title: string
  questions: Question[]
  timeLimit: number | null
  isAssessment: boolean
  subjectSlug: string
  accent: string
}) {
  return (
    <QuestPlayer
      title={title}
      questions={questions}
      timeLimit={timeLimit}
      isAssessment={isAssessment}
      accent={accent}
      backHref={`/subjects/${subjectSlug}`}
      backLabel="Back to quest line"
      allowRetry
      onSubmit={(responses: Record<string, Response>, duration: number) => submitQuestAttempt(questId, responses, duration)}
    />
  )
}
