import type { Metadata } from 'next'
import { ClipboardList } from 'lucide-react'
import { PageHeader } from '@/components/ui/misc'
import { requireUser } from '@/lib/auth'
import { SurveyForm } from './survey-form'

export const metadata: Metadata = { title: 'Surveys' }

export default async function SurveysPage() {
  const { supabase, profile } = await requireUser()
  const { data } = await supabase.from('survey_responses').select('instrument, answers, score, created_at').eq('user_id', profile.id)
  const byInstrument = Object.fromEntries((data ?? []).map((r) => [r.instrument, r])) as Record<string, { answers: number[]; score: number; created_at: string } | undefined>

  return (
    <>
      <PageHeader
        title="Surveys"
        description="Help evaluate DOrSU IT Quest. Your answers are anonymous in reports (identified only by your student code) and do not affect your grades."
        icon={ClipboardList}
      />
      <div className="space-y-6">
        <SurveyForm instrument="sus" existing={byInstrument.sus} />
        <SurveyForm instrument="motivation" existing={byInstrument.motivation} />
      </div>
    </>
  )
}
