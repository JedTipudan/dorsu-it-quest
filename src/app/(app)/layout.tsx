import { AppShell } from '@/components/layout/app-shell'
import { requireUser } from '@/lib/auth'
import { frameRing, titleName } from '@/lib/cosmetics'
import { activeStreak } from '@/lib/gamification'
import { manilaToday } from '@/lib/utils'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireUser()
  // Has the player claimed today's Supply Drop? (error = check-in upgrade not installed: hide the nudge)
  const { count, error } = await supabase.from('daily_checkins')
    .select('day', { count: 'exact', head: true }).eq('user_id', profile.id).eq('day', manilaToday())
  return (
    <AppShell
      user={{
        displayName: profile.display_name || profile.full_name || 'Quester',
        fullName: profile.full_name,
        role: profile.role,
        xp: profile.xp,
        streak: activeStreak(profile.streak, profile.last_active_date),
        title: titleName(profile.equipped_title),
        frame: frameRing(profile.equipped_frame),
        checkinReady: !error && (count ?? 0) === 0,
      }}
    >
      {children}
    </AppShell>
  )
}
