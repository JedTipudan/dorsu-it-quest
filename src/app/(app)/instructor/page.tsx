import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, ArrowRight, BarChart3, GraduationCap, Hammer, Inbox, Megaphone, Plus, Radar, Users } from 'lucide-react'
import { RadarPanel, WatchlistPanel, type RadarRow, type WatchRow } from '@/components/staff/panels'
import { LinkButton } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PageHeader, Pill, StatCard } from '@/components/ui/misc'
import { requireStaff } from '@/lib/auth'
import type { ClassRow } from '@/lib/types'
import { errorMessage, formatNumber, isoDaysAgo, manilaToday, num } from '@/lib/utils'

export const metadata: Metadata = { title: 'Command Center' }

export default async function CommandCenter({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { class: classParam } = await searchParams
  const { supabase, profile } = await requireStaff()
  const isAdmin = profile.role === 'admin'
  const classQuery = supabase.from('classes').select('*, subjects(name, color), class_members(count)').order('created_at', { ascending: false })
  const { data: classes } = isAdmin ? await classQuery : await classQuery.eq('instructor_id', profile.id)

  type C = ClassRow & { subjects: { name: string; color: string } | null; class_members: { count: number }[] }
  const list = (classes ?? []) as unknown as C[]
  const classId = list.some((c) => c.id === classParam) ? classParam! : null

  const weekAgo = isoDaysAgo(7)
  const [{ data: weekAttempts }, { count: feedbackCount }, { count: questCount }, watch, radar, { count: briefings }] = await Promise.all([
    supabase.from('attempts').select('user_id, percent').neq('user_id', profile.id).gte('created_at', weekAgo).limit(5000),
    supabase.from('feedback').select('id', { count: 'exact', head: true }),
    supabase.from('quests').select('id', { count: 'exact', head: true }),
    supabase.rpc('staff_watchlist', { p_class: classId }),
    supabase.rpc('remediation_radar', { p_class: classId, p_limit: 8 }),
    supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('author_id', profile.id),
  ])
  // Attendance: my students who checked in today (RLS limits rows to students I can see).
  const { count: checkedInToday } = await supabase.from('daily_checkins').select('user_id', { count: 'exact', head: true })
    .eq('day', manilaToday()).neq('user_id', profile.id)

  const students = list.reduce((a, c) => a + (c.class_members?.[0]?.count ?? 0), 0)
  const wa = weekAttempts ?? []
  const avg = wa.length ? wa.reduce((a, r) => a + num(r.percent), 0) / wa.length : 0
  const active = new Set(wa.map((r) => r.user_id)).size
  // Missing tables/functions = the database upgrade hasn't been run yet.
  const upgradeHint = 'Run supabase/upgrade-staff-tools.sql in the Supabase SQL Editor to enable this panel.'
  const rpcError = (e: unknown) => (e ? (/does not exist|schema cache/i.test(errorMessage(e)) ? upgradeHint : errorMessage(e)) : undefined)

  return (
    <>
      <PageHeader
        title="Command Center"
        description={isAdmin ? 'Every class on the platform: spot who needs help and which topics need re-teaching.' : 'Your classes at a glance: spot who needs help and which topics need re-teaching.'}
        icon={GraduationCap}
        actions={
          <>
            <LinkButton href="/instructor/announcements" variant="outline"><Megaphone className="size-4" aria-hidden="true" /> Post briefing</LinkButton>
            <LinkButton href="/instructor/classes?new=1" variant="accent"><Plus className="size-4" aria-hidden="true" /> New class</LinkButton>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
        <StatCard label="Classes" value={list.length} icon={Users} />
        <StatCard label="Students" value={students} icon={GraduationCap} tone="violet" />
        <StatCard label="Active this week" value={active} icon={Activity} tone="emerald" hint={`${formatNumber(wa.length)} attempts · ${checkedInToday ?? 0} checked in today`} />
        <StatCard label="Avg score (7d)" value={`${avg.toFixed(1)}%`} icon={BarChart3} tone="orange" />
      </section>

      {list.length > 1 && (
        <nav aria-label="Filter by class" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <FilterChip href="/instructor" active={!classId}>All classes</FilterChip>
          {list.map((c) => <FilterChip key={c.id} href={`/instructor?class=${c.id}`} active={classId === c.id}>{c.name}</FilterChip>)}
        </nav>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <WatchlistPanel rows={(watch.data ?? []) as WatchRow[]} error={rpcError(watch.error)} />
        <RadarPanel rows={(radar.data ?? []) as RadarRow[]} error={rpcError(radar.error)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{isAdmin ? 'All classes' : 'My classes'}</CardTitle>
            <Link href="/instructor/classes" className="text-sm font-semibold text-indigo-700 hover:underline">Manage</Link>
          </CardHeader>
          <CardBody>
            {list.length === 0 ? (
              <EmptyState icon={Users} title="No classes yet" description="Create a class and share its join code with your students." action={<LinkButton href="/instructor/classes?new=1">Create class</LinkButton>} />
            ) : (
              <ul className="divide-y divide-line">
                {list.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <Link href={`/instructor/classes/${c.id}`} className="-mx-2 flex items-center gap-3 rounded-lg p-2 py-3 hover:bg-indigo-50/60">
                      <span className="size-3 shrink-0 rotate-45" style={{ background: c.subjects?.color, boxShadow: `0 0 8px ${c.subjects?.color}` }} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.subjects?.name} · {c.class_members?.[0]?.count ?? 0} students · code <span className="font-mono text-lime">{c.join_code}</span></p>
                      </div>
                      {c.group_type !== 'none' && <Pill tone={c.group_type === 'experimental' ? 'violet' : 'slate'}>{c.group_type}</Pill>}
                      <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <div className="grid content-start gap-3">
          {[
            { href: '/instructor/content', icon: Hammer, title: 'Quest Forge', text: `${questCount ?? 0} quests · build quizzes, simulations, boss fights` },
            { href: '/instructor/announcements', icon: Megaphone, title: 'Briefings', text: `${briefings ?? 0} posted · announce quizzes and deadlines` },
            { href: '/instructor/research', icon: Radar, title: 'Research results', text: 'Pre/post t-tests, effect sizes, SUS and motivation' },
            { href: '/instructor/feedback', icon: Inbox, title: 'Feedback inbox', text: `${feedbackCount ?? 0} suggestions from students` },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="card card-hover flex items-center gap-4 p-4">
              <span className="chamfer-sm grid size-11 place-items-center bg-indigo-100 text-indigo-700"><l.icon className="size-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1"><p className="font-display font-bold text-white uppercase">{l.title}</p><p className="text-sm text-slate-600">{l.text}</p></div>
              <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} scroll={false} aria-current={active ? 'true' : undefined}
      className={`chamfer-sm inline-flex h-9 shrink-0 items-center px-4 font-display text-sm font-semibold tracking-wide whitespace-nowrap uppercase transition ${active ? 'bg-lime text-lime-ink' : 'bg-panel text-slate-600 ring-1 ring-line hover:text-white'}`}>
      {children}
    </Link>
  )
}
