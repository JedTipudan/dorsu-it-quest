import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Activity, ArrowRight, BookOpen, Download, GraduationCap, Hammer, KeyRound, Medal, Megaphone, Shield, ShieldCheck, Swords, UserPlus, Users,
} from 'lucide-react'
import { RadarPanel, WatchlistPanel, type RadarRow, type WatchRow } from '@/components/staff/panels'
import { LinkButton } from '@/components/ui/button'
import { Alert, PageHeader, StatCard } from '@/components/ui/misc'
import { requireAdmin } from '@/lib/auth'
import { num } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin HQ' }

interface Pulse {
  students: number; instructors: number; admins: number; new_7d: number; active_today: number; active_7d: number
  attempts_7d: number; avg_7d: number | null; classes: number; quests_live: number; quests_draft: number
  questions: number; badges_awarded: number
  daily: { day: string; attempts: number; players: number }[]
  subjects: { name: string; color: string; attempts: number; avg: number | null }[]
}

export default async function AdminHQ() {
  const { supabase } = await requireAdmin()
  const [pulseRes, watch, radar] = await Promise.all([
    supabase.rpc('platform_pulse'),
    supabase.rpc('staff_watchlist', { p_class: null }),
    supabase.rpc('remediation_radar', { p_class: null, p_limit: 6 }),
  ])
  const pulse = pulseRes.data as Pulse | null

  if (!pulse) {
    return (
      <>
        <PageHeader title="Admin HQ" icon={Shield} />
        <Alert tone="warning">
          Admin HQ needs a one-time database upgrade. In Supabase, open <b>SQL Editor → New query</b>, paste <code>supabase/upgrade-staff-tools.sql</code> and click <b>Run</b>, then reload this page.
          {pulseRes.error && <span className="mt-1 block font-mono text-xs opacity-80">{pulseRes.error.message}</span>}
        </Alert>
      </>
    )
  }

  const maxDay = Math.max(1, ...pulse.daily.map((d) => num(d.attempts)))
  const activeRate = pulse.students ? Math.round((num(pulse.active_7d) / num(pulse.students)) * 100) : 0

  return (
    <>
      <PageHeader
        title="Admin HQ"
        description="The whole platform at a glance: adoption, activity, content health and the students who need support."
        icon={Shield}
        actions={
          <>
            <LinkButton href="/admin/users" variant="outline"><UserPlus className="size-4" aria-hidden="true" /> Manage roles</LinkButton>
            <LinkButton href="/instructor/content/quests/new" variant="accent"><Hammer className="size-4" aria-hidden="true" /> Forge quest</LinkButton>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Platform totals">
        <StatCard label="Students" value={num(pulse.students)} icon={GraduationCap} tone="violet" hint={`+${num(pulse.new_7d)} new this week`} />
        <StatCard label="Active (7 days)" value={num(pulse.active_7d)} icon={Activity} tone="emerald" hint={`${activeRate}% of students · ${num(pulse.active_today)} today`} />
        <StatCard label="Attempts (7 days)" value={num(pulse.attempts_7d)} icon={Swords} tone="orange" hint={pulse.avg_7d !== null ? `avg score ${num(pulse.avg_7d).toFixed(1)}%` : 'no scores yet'} />
        <StatCard label="Staff" value={num(pulse.instructors) + num(pulse.admins)} icon={ShieldCheck} tone="sky" hint={`${num(pulse.instructors)} instructors · ${num(pulse.admins)} admins`} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* 14-day activity */}
        <section className="card p-5" aria-labelledby="act-h">
          <div className="flex items-end justify-between">
            <div>
              <p className="hud hud-tick">Last 14 days</p>
              <h2 id="act-h" className="font-display text-lg font-bold text-white uppercase">Arena activity</h2>
            </div>
            <p className="font-mono text-xs text-slate-500">attempts per day</p>
          </div>
          <div className="mt-5 flex h-44 items-end gap-1.5" role="img" aria-label={`Attempts per day over the last 14 days, peak ${maxDay}`}>
            {pulse.daily.map((d, i) => {
              const n = num(d.attempts)
              const h = Math.max(3, (n / maxDay) * 100)
              const today = i === pulse.daily.length - 1
              return (
                <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
                  <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-white opacity-0 ring-1 ring-line transition group-hover:opacity-100">
                    {n} · {num(d.players)}p
                  </span>
                  <div className="w-full rounded-t-sm transition-all duration-700 group-hover:brightness-125"
                    style={{ height: `${h}%`, background: today ? '#c4ff3d' : 'linear-gradient(180deg,#8268ff,#4c2fd6)', boxShadow: today ? '0 0 14px #c4ff3d' : undefined }} />
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-500">
            <span>{new Date(pulse.daily[0]?.day).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
            <span className="text-lime">Today</span>
          </div>
        </section>

        {/* Subject health */}
        <section className="card p-5" aria-labelledby="sub-h">
          <p className="hud hud-tick">Last 30 days</p>
          <h2 id="sub-h" className="font-display text-lg font-bold text-white uppercase">World health</h2>
          <ul className="mt-4 space-y-4">
            {pulse.subjects.map((s) => {
              const avg = s.avg === null ? null : num(s.avg)
              return (
                <li key={s.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold text-slate-900"><span className="size-2 rotate-45" style={{ background: s.color }} />{s.name}</span>
                    <span className="font-mono text-xs text-slate-500">{num(s.attempts)} plays · <span style={{ color: avg === null ? undefined : avg < 50 ? '#ff3d7f' : avg < 75 ? '#ffc53d' : '#c4ff3d' }}>{avg === null ? '—' : `${avg.toFixed(0)}%`}</span></span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-sm bg-slate-100">
                    <div className="h-full transition-all duration-700" style={{ width: `${avg ?? 0}%`, background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { l: 'Live quests', v: num(pulse.quests_live), i: BookOpen },
              { l: 'Drafts', v: num(pulse.quests_draft), i: Hammer },
              { l: 'Badges won', v: num(pulse.badges_awarded), i: Medal },
            ].map((x) => (
              <div key={x.l} className="rounded-md bg-panel-2 py-2.5 ring-1 ring-line">
                <x.i className="mx-auto size-4 text-indigo-700" aria-hidden="true" />
                <p className="font-display text-lg font-bold text-white">{x.v}</p>
                <p className="hud text-[9px]">{x.l}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <WatchlistPanel rows={(watch.data ?? []) as WatchRow[]} error={watch.error?.message} />
        <RadarPanel rows={(radar.data ?? []) as RadarRow[]} error={radar.error?.message} />
      </div>

      {/* Admin tools */}
      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Admin tools">
        {[
          { href: '/admin/users', icon: Users, title: 'Users & roles', text: 'Promote faculty to Instructor or Admin' },
          { href: '/instructor/announcements', icon: Megaphone, title: 'Global briefing', text: 'Announce to every student at once' },
          { href: '/instructor/research', icon: Activity, title: 'Research results', text: 'Pre/post t-tests, SUS, motivation' },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="card card-hover flex items-center gap-3 p-4">
            <span className="chamfer-sm grid size-10 place-items-center bg-indigo-100 text-indigo-700"><l.icon className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><p className="font-display font-bold text-white uppercase">{l.title}</p><p className="text-xs text-slate-600">{l.text}</p></div>
            <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />
          </Link>
        ))}
        <a href="/admin/code-key" className="card card-hover flex items-center gap-3 border-gold/40 p-4">
          <span className="chamfer-sm grid size-10 place-items-center bg-gold/15 text-gold"><KeyRound className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><p className="font-display font-bold text-white uppercase">Code–identity key</p><p className="text-xs text-slate-600">Confidential CSV: student code ↔ name. Store separately.</p></div>
          <Download className="size-4 text-gold" aria-hidden="true" />
        </a>
      </section>
    </>
  )
}
