import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, ClipboardList, Flame, FlaskConical, Gift, Medal, Swords, Target, Trophy, Zap,
} from 'lucide-react'
import { CountUp } from '@/components/fx/count-up'
import { BadgeMedal, SubjectIcon, type Tier } from '@/components/game/bits'
import { RankEmblem } from '@/components/game/rank-emblem'
import { LinkButton } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, Pill, Progress, StatCard } from '@/components/ui/misc'
import { BriefingCard, type Briefing } from '@/components/staff/briefing-card'
import { homeFor, isStaffRole, requireUser } from '@/lib/auth'
import { getSubjectsProgress } from '@/lib/data'
import { frameRing, titleName } from '@/lib/cosmetics'
import { activeStreak, levelProgress, QUEST_TYPE_LABEL, rankTier, rankTitle } from '@/lib/gamification'
import { formatDateTime, formatNumber, manilaMidnightIso, manilaToday, num } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams
  const { supabase, profile } = await requireUser()

  const [subjects, { data: recent }, { data: myBadges }, { count: challengeToday }, { data: surveys }, { count: totalBadges }] = await Promise.all([
    getSubjectsProgress(supabase, profile.id),
    supabase.from('attempts').select('id, mode, percent, xp_earned, created_at, passed, quests(title, type), subjects(name, color, icon)')
      .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('user_badges').select('awarded_at, badges(code, name, icon, tier)').eq('user_id', profile.id).order('awarded_at', { ascending: false }),
    supabase.from('attempts').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('mode', 'challenge')
      .gte('created_at', manilaMidnightIso()),
    supabase.from('survey_responses').select('instrument').eq('user_id', profile.id),
    supabase.from('badges').select('id', { count: 'exact', head: true }),
  ])
  // Mission briefings from instructors (silently skipped if the staff-tools upgrade isn't installed yet).
  const { data: briefingRows } = await supabase.from('announcements').select('*')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3)
  const briefings = (briefingRows ?? []) as Briefing[]
  const { count: checkedIn, error: checkinErr } = await supabase.from('daily_checkins')
    .select('day', { count: 'exact', head: true }).eq('user_id', profile.id).eq('day', manilaToday())
  const dropReady = !checkinErr && (checkedIn ?? 0) === 0
  const title = titleName(profile.equipped_title)
  const staff = isStaffRole(profile.role)

  const lp = levelProgress(profile.xp)
  const tier = rankTier(lp.level)
  const streak = activeStreak(profile.streak, profile.last_active_date)
  const passedTotal = subjects.reduce((a, s) => a + s.passed, 0)
  const questTotal = subjects.reduce((a, s) => a + s.total, 0)
  const nextUp = subjects.map((s) => s.next && { subject: s, quest: s.next }).filter(Boolean)[0]
  const pendingPretests = subjects.flatMap((s) => s.assessments.filter((a) => a.type === 'pretest' && a.status !== 'passed').map((a) => ({ ...a, subject: s })))
  const openPosttests = subjects.flatMap((s) => s.assessments.filter((a) => a.type === 'posttest' && a.status !== 'passed').map((a) => ({ ...a, subject: s })))
  const surveysDone = new Set((surveys ?? []).map((s: { instrument: string }) => s.instrument))
  type RecentRow = { id: string; mode: string; percent: number; xp_earned: number; created_at: string; passed: boolean; quests: { title: string; type: string } | null; subjects: { name: string; color: string; icon: string } | null }
  type BadgeRow = { awarded_at: string; badges: { code: string; name: string; icon: string; tier: Tier } | null }
  const firstName = (profile.display_name || profile.full_name).split(' ')[0]

  return (
    <div className="space-y-6">
      {staff && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          <p className="text-amber-900"><b className="font-display tracking-wide uppercase">Player mode</b>: you&apos;re seeing the app as a student does. Your progress here is real, so use it to playtest quests.</p>
          <LinkButton href={homeFor(profile.role)} size="sm" variant="outline">Back to {profile.role === 'admin' ? 'Admin HQ' : 'Command Center'}</LinkButton>
        </div>
      )}

      {dropReady && (
        <Link href="/checkin" className="group card chamfer relative flex items-center gap-4 overflow-hidden border-lime/60 p-4 shadow-glow-lime">
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-lime/15 via-transparent to-transparent" />
          <span className="chamfer-sm relative grid size-12 shrink-0 place-items-center bg-lime text-lime-ink animate-float"><Gift className="size-6" aria-hidden="true" /></span>
          <div className="relative flex-1">
            <p className="font-display text-lg font-bold text-white uppercase">Daily supply drop is ready</p>
            <p className="text-sm text-slate-600">Check in for XP and exclusive gear, then clear the Daily Byte to double it.</p>
          </div>
          <span className="relative font-display font-bold text-lime uppercase transition group-hover:translate-x-1">Claim →</span>
        </Link>
      )}

      {briefings.length > 0 && (
        <section aria-label="Mission briefings" className="stagger space-y-3">
          {briefings.map((b) => <BriefingCard key={b.id} b={b} compact />)}
        </section>
      )}

      {welcome && (
        <Alert tone="success">
          <strong>Welcome to DOrSU IT Quest, {firstName}!</strong> Start with a subject pretest to record your baseline, then begin your first quest.
        </Alert>
      )}

      {/* Hero */}
      <section className="card chamfer relative isolate overflow-hidden border-line-bright p-6 animate-rise sm:p-8">
        <div aria-hidden="true" className="arena-floor -z-10 opacity-50" />
        <div aria-hidden="true" className="absolute -top-24 -left-16 -z-10 size-72 rounded-full opacity-50 blur-3xl" style={{ background: tier.glow }} />
        <div className="relative grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
          <RankEmblem level={lp.level} size="xl" animated frame={frameRing(profile.equipped_frame)} className="mx-auto md:mx-0" />
          <div className="text-center md:text-left">
            <p className="hud hud-tick">Mabuhay, {firstName}</p>
            <h1 className="mt-1 text-4xl font-bold uppercase sm:text-5xl">
              <span style={{ color: tier.from }}>{tier.name}</span> <span className="text-white">· LV {lp.level}</span>
            </h1>
            <p className="font-display text-lg text-slate-600 uppercase">{title ? <span className="text-gold">« {title} »</span> : rankTitle(lp.level)}</p>
            <div className="mx-auto mt-4 max-w-md md:mx-0">
              <Progress value={lp.percent} className="h-3" shine barClassName="from-indigo-500 to-lime" label="Level progress" />
              <p className="mt-1.5 flex justify-between font-mono text-xs text-slate-500">
                <span><CountUp value={lp.current} className="text-white" /> / {formatNumber(lp.needed)} XP</span>
                <span className="text-lime">{formatNumber(lp.toNext)} to LV {lp.level + 1}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 md:items-end">
            <p className="hud">{nextUp ? 'Next quest' : 'Daily mode'}</p>
            {nextUp ? (
              <LinkButton href={`/quests/${nextUp.quest.id}`} variant="accent" size="lg" className="shine max-w-full">
                <span className="truncate">Play: {nextUp.quest.title}</span> <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
              </LinkButton>
            ) : (
              <LinkButton href="/challenge" variant="accent" size="lg" className="shine">Daily Challenge <Swords className="size-5" aria-hidden="true" /></LinkButton>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Your stats">
        <StatCard label="Total XP" value={profile.xp} icon={Zap} tone="orange" />
        <StatCard label="Day streak" value={streak} icon={Flame} tone="orange" hint={`Best: ${profile.best_streak} days`} />
        <StatCard label="Quests passed" value={`${passedTotal}/${questTotal}`} icon={Target} tone="emerald" />
        <StatCard label="Badges" value={`${myBadges?.length ?? 0}/${totalBadges ?? 0}`} icon={Medal} tone="violet" />
      </section>

      {/* To-do prompts */}
      {(pendingPretests.length > 0 || openPosttests.length > 0 || !challengeToday || surveysDone.size < 2) && (
        <section className="stagger grid gap-3 md:grid-cols-2" aria-label="Things to do">
          {!challengeToday && (
            <Link href="/challenge" className="card card-hover flex items-center gap-4 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-700"><Swords className="size-6" aria-hidden="true" /></span>
              <div className="flex-1"><p className="font-bold">Daily Challenge available</p><p className="text-sm text-slate-600">10 adaptive questions · +30 XP daily bonus</p></div>
              <ArrowRight className="size-5 text-slate-400" aria-hidden="true" />
            </Link>
          )}
          {openPosttests.slice(0, 2).map((a) => (
            <Link key={a.id} href={`/quests/${a.id}`} className="card card-hover flex items-center gap-4 border-violet-500/40 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><ClipboardCheck className="size-6" aria-hidden="true" /></span>
              <div className="flex-1"><p className="font-bold">{a.title} is open</p><p className="text-sm text-slate-600">Your instructor opened the final assessment.</p></div>
              <ArrowRight className="size-5 text-slate-400" aria-hidden="true" />
            </Link>
          ))}
          {pendingPretests.slice(0, 2).map((a) => (
            <Link key={a.id} href={`/quests/${a.id}`} className="card card-hover flex items-center gap-4 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700"><ClipboardCheck className="size-6" aria-hidden="true" /></span>
              <div className="flex-1"><p className="font-bold">{a.title}</p><p className="text-sm text-slate-600">Record your baseline before starting {a.subject.name}.</p></div>
              <ArrowRight className="size-5 text-slate-400" aria-hidden="true" />
            </Link>
          ))}
          {surveysDone.size < 2 && passedTotal >= 3 && (
            <Link href="/surveys" className="card card-hover flex items-center gap-4 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ClipboardList className="size-6" aria-hidden="true" /></span>
              <div className="flex-1"><p className="font-bold">Share your experience</p><p className="text-sm text-slate-600">Two short surveys about the platform (5 minutes).</p></div>
              <ArrowRight className="size-5 text-slate-400" aria-hidden="true" />
            </Link>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Subjects */}
        <Card>
          <CardHeader>
            <CardTitle>Subject mastery</CardTitle>
            <Link href="/subjects" className="text-sm font-semibold text-indigo-700 hover:underline">All subjects</Link>
          </CardHeader>
          <CardBody className="space-y-4">
            {subjects.map((s) => (
              <Link key={s.id} href={`/subjects/${s.slug}`} className="-mx-2 flex items-center gap-3 rounded-2xl p-2 transition hover:bg-indigo-50/70">
                <SubjectIcon icon={s.icon} color={s.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{s.name}</p>
                    <span className="text-sm font-bold" style={{ color: s.color }}>{s.percent}%</span>
                  </div>
                  <Progress value={s.percent} className="mt-1.5 h-2" color={s.color} label={`${s.name} progress`} />
                  <p className="mt-1 truncate text-xs text-slate-500">{s.passed}/{s.total} quests · {s.next ? `Next: ${s.next.title}` : s.total ? 'All quests passed!' : 'No quests yet'}</p>
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Latest badges</CardTitle>
              <Link href="/badges" className="text-sm font-semibold text-indigo-700 hover:underline">View all</Link>
            </CardHeader>
            <CardBody>
              {(myBadges ?? []).length === 0 ? (
                <p className="text-sm text-slate-600">No badges yet — pass your first quest to earn <strong>First Steps</strong>.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {((myBadges ?? []) as unknown as BadgeRow[]).slice(0, 4).map((b) => b.badges && (
                    <div key={b.badges.code} className="flex flex-col items-center text-center" title={b.badges.name}>
                      <BadgeMedal icon={b.badges.icon} tier={b.badges.tier} size="sm" />
                      <p className="mt-1 line-clamp-2 text-[11px] font-semibold">{b.badges.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { href: '/labs', label: 'Labs', icon: FlaskConical },
              { href: '/leaderboard', label: 'Ranks', icon: Trophy },
              { href: '/subjects', label: 'Quests', icon: BookOpen },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="card card-hover flex flex-col items-center gap-1.5 p-4 font-display text-sm font-semibold tracking-wide uppercase">
                <l.icon className="size-6 text-indigo-600" aria-hidden="true" />{l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardBody>
          {(recent ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">Your completed quests and challenges will appear here.</p>
          ) : (
            <ul className="divide-y divide-indigo-50">
              {((recent ?? []) as unknown as RecentRow[]).map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  {a.passed ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" aria-label="Passed" /> : <Target className="size-5 shrink-0 text-orange-500" aria-label="Attempted" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.quests?.title ?? (a.mode === 'challenge' ? `Daily Challenge${a.subjects ? ` · ${a.subjects.name}` : ' · Mixed'}` : 'Activity')}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(a.created_at)}{a.quests && ` · ${QUEST_TYPE_LABEL[a.quests.type]}`}</p>
                  </div>
                  <Pill tone={num(a.percent) >= 60 ? 'emerald' : 'orange'}>{Math.round(num(a.percent))}%</Pill>
                  <span className="w-16 text-right font-display text-sm font-bold text-lime">+{a.xp_earned} XP</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
