import type { Metadata } from 'next'
import { CalendarCheck } from 'lucide-react'
import { Alert, PageHeader } from '@/components/ui/misc'
import { requireUser } from '@/lib/auth'
import { levelForXp } from '@/lib/gamification'
import { CheckinHub } from './checkin-hub'
import type { CatalogItem, CheckinStatus } from './types'

export const metadata: Metadata = { title: 'Daily check-in' }

export default async function CheckinPage() {
  const { supabase, profile } = await requireUser()
  const [status, { data: catalog }, { data: owned }] = await Promise.all([
    supabase.rpc('checkin_status'),
    supabase.from('cosmetics').select('code, kind, name, description, rarity, unlock_type, threshold').order('sort_order'),
    supabase.from('user_cosmetics').select('code').eq('user_id', profile.id),
  ])

  if (status.error || !status.data) {
    return (
      <>
        <PageHeader title="Daily check-in" icon={CalendarCheck} />
        <Alert tone="warning">
          Daily check-in needs a one-time database upgrade. An admin should run <code>supabase/upgrade-daily-checkin.sql</code> in the Supabase SQL Editor.
        </Alert>
      </>
    )
  }

  return (
    <CheckinHub
      initial={status.data as CheckinStatus}
      catalog={(catalog ?? []) as CatalogItem[]}
      owned={(owned ?? []).map((o) => o.code as string)}
      equipped={{ title: profile.equipped_title ?? null, frame: profile.equipped_frame ?? null }}
      level={levelForXp(profile.xp)}
    />
  )
}
