import type { Metadata } from 'next'
import { Swords } from 'lucide-react'
import { PageHeader } from '@/components/ui/misc'
import { requireUser } from '@/lib/auth'
import { manilaMidnightIso } from '@/lib/utils'
import type { Subject } from '@/lib/types'
import { ChallengeClient } from './challenge-client'

export const metadata: Metadata = { title: 'Daily Challenge' }
export const dynamic = 'force-dynamic'

export default async function ChallengePage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams
  const { supabase, profile } = await requireUser()
  const [{ data: subjects }, { count }] = await Promise.all([
    supabase.from('subjects').select('*').order('sort_order'),
    supabase.from('attempts').select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id).eq('mode', 'challenge')
      .gte('created_at', manilaMidnightIso()),
  ])

  return (
    <>
      <PageHeader
        title="Daily Challenge"
        description="10 questions picked for your skill level. Answer within the time limit — your first challenge each day earns a +30 XP bonus."
        icon={Swords}
      />
      <ChallengeClient subjects={(subjects ?? []) as Subject[]} doneToday={count ?? 0} initialSubject={subject ?? null} />
    </>
  )
}
