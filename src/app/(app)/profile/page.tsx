import type { Metadata } from 'next'
import { Flame, Hash, Medal, Target, User, Zap } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, PageHeader, Pill, StatCard } from '@/components/ui/misc'
import { requireUser } from '@/lib/auth'
import { activeStreak, levelProgress, rankTitle } from '@/lib/gamification'
import { formatDate, formatNumber, initials } from '@/lib/utils'
import { ClassesCard, ProfileForm } from './profile-forms'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ complete?: string }> }) {
  const { complete } = await searchParams
  const { supabase, profile } = await requireUser()
  const [{ data: memberships }, { count: badgeCount }, { count: passedCount }] = await Promise.all([
    supabase.from('class_members').select('class_id, joined_at, classes(id, name, group_type, subjects(name))').eq('student_id', profile.id),
    supabase.from('user_badges').select('badge_id', { count: 'exact', head: true }).eq('user_id', profile.id),
    supabase.from('attempts').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('passed', true).eq('mode', 'quest'),
  ])
  const lp = levelProgress(profile.xp)
  type M = { class_id: string; joined_at: string; classes: { id: string; name: string; subjects: { name: string } | null } | null }
  const classes = ((memberships ?? []) as unknown as M[]).filter((m) => m.classes).map((m) => ({ id: m.class_id, name: m.classes!.name, subject: m.classes!.subjects?.name ?? '', joined_at: m.joined_at }))

  return (
    <>
      <PageHeader title="Profile" description="Manage your account, privacy and classes." icon={User} />
      {complete && profile.year_level === null && (
        <Alert tone="info" className="mb-6">
          <b>Welcome to the arena, {profile.display_name || 'player'}!</b> You signed in with Google, so finish your player profile:
          add your <b>year level</b> and <b>section</b> below so you show up in the right class rankings. You can also change your display name.
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden text-center">
            <div className="h-20 bg-gradient-to-br from-indigo-600 to-violet-600" />
            <div className="-mt-10 px-5 pb-5">
              <span className="mx-auto grid size-20 place-items-center chamfer border-4 border-panel bg-lime font-display text-3xl font-bold text-lime-ink shadow-clay">{initials(profile.display_name || profile.full_name)}</span>
              <h2 className="mt-3 text-xl font-bold">{profile.display_name}</h2>
              <p className="text-sm text-slate-600">{profile.full_name}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <Pill tone="indigo">Lv {lp.level} · {rankTitle(lp.level)}</Pill>
                <Pill tone="slate" className="capitalize">{profile.role}</Pill>
              </div>
              <p className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 py-2 font-mono text-sm font-semibold text-indigo-800" title="Your anonymous research code">
                <Hash className="size-4" aria-hidden="true" />{profile.student_code}
              </p>
              <p className="mt-1 text-xs text-slate-500">Anonymous student code used in research reports · Joined {formatDate(profile.created_at)}</p>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="XP" value={formatNumber(profile.xp)} icon={Zap} tone="orange" />
            <StatCard label="Streak" value={activeStreak(profile.streak, profile.last_active_date)} icon={Flame} tone="orange" hint={`Best ${profile.best_streak}`} />
            <StatCard label="Passed" value={passedCount ?? 0} icon={Target} tone="emerald" hint="quest attempts" />
            <StatCard label="Badges" value={badgeCount ?? 0} icon={Medal} tone="violet" />
          </div>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Account & privacy</CardTitle></CardHeader>
            <CardBody><ProfileForm profile={profile} /></CardBody>
          </Card>
          <ClassesCard classes={classes} />
        </div>
      </div>
    </>
  )
}
