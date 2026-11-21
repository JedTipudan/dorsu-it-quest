import type { Metadata } from 'next'
import { Medal } from 'lucide-react'
import { BadgeMedal, tierLabel } from '@/components/game/bits'
import { PageHeader, Pill, Progress } from '@/components/ui/misc'
import { requireUser } from '@/lib/auth'
import type { Badge } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Badges' }

export default async function BadgesPage() {
  const { supabase, profile } = await requireUser()
  const [{ data: badges }, { data: mine }] = await Promise.all([
    supabase.from('badges').select('*').order('sort_order'),
    supabase.from('user_badges').select('badge_id, awarded_at').eq('user_id', profile.id),
  ])
  const earned = new Map((mine ?? []).map((b: { badge_id: string; awarded_at: string }) => [b.badge_id, b.awarded_at]))
  const all = (badges ?? []) as Badge[]
  const pct = all.length ? (earned.size / all.length) * 100 : 0

  return (
    <>
      <PageHeader title="Badges" description="Badges mark real competencies. Collect them by passing quests, keeping streaks and mastering subjects." icon={Medal} />
      <div className="card mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <p className="font-display text-3xl font-bold">{earned.size}<span className="text-lg text-slate-400"> / {all.length}</span></p>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600">Collection progress</p>
          <Progress value={pct} className="mt-1.5" label="Badges collected" />
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {all.map((b) => {
          const at = earned.get(b.id)
          return (
            <li key={b.id} className={cn('card flex flex-col items-center p-5 text-center transition', at ? 'hover:-translate-y-1 hover:shadow-clay-lg' : 'bg-slate-50/60')}>
              <BadgeMedal icon={b.icon} tier={b.tier} earned={Boolean(at)} size="lg" />
              <Pill tone={b.tier === 'gold' ? 'amber' : b.tier === 'silver' ? 'slate' : 'orange'} className="mt-3">{tierLabel(b.tier)}</Pill>
              <h2 className={cn('mt-2 font-sans text-base font-bold', !at && 'text-slate-500')}>{b.name}</h2>
              <p className="mt-0.5 text-sm text-slate-600">{b.description}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">{at ? `Earned ${formatDate(at)}` : 'Locked'}</p>
            </li>
          )
        })}
      </ul>
    </>
  )
}
