import type { Metadata } from 'next'
import Link from 'next/link'
import { Crown, EyeOff, Medal, Trophy } from 'lucide-react'
import { RankEmblem } from '@/components/game/rank-emblem'
import { EmptyState, PageHeader, Pill } from '@/components/ui/misc'
import { requireUser } from '@/lib/auth'
import type { LeaderboardRow, Subject } from '@/lib/types'
import { cn, formatNumber, num } from '@/lib/utils'

export const metadata: Metadata = { title: 'Leaderboard' }

type Search = { period?: string; subject?: string; class?: string }

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} scroll={false} aria-current={active ? 'true' : undefined}
      className={cn('chamfer-sm inline-flex h-9 items-center px-4 font-display text-sm font-semibold tracking-wide whitespace-nowrap uppercase transition', active ? 'bg-lime text-lime-ink shadow-glow-lime' : 'bg-panel text-slate-600 ring-1 ring-line hover:bg-indigo-50 hover:text-white')}>
      {children}
    </Link>
  )
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const period = ['week', 'month'].includes(sp.period ?? '') ? sp.period! : 'all'
  const { supabase, profile } = await requireUser()

  const [{ data: subjects }, { data: memberships }] = await Promise.all([
    supabase.from('subjects').select('id, name, short_name, color').order('sort_order'),
    supabase.from('class_members').select('class_id, classes(id, name)').eq('student_id', profile.id),
  ])
  const classes = ((memberships ?? []) as unknown as { classes: { id: string; name: string } | null }[]).map((m) => m.classes).filter(Boolean) as { id: string; name: string }[]
  const subjectId = (subjects ?? []).some((s) => s.id === sp.subject) ? sp.subject! : null
  const classId = classes.some((c) => c.id === sp.class) ? sp.class! : null

  const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period, p_subject: subjectId, p_class: classId, p_limit: 50 })
  const rows = ((data ?? []) as LeaderboardRow[]).map((r) => ({ ...r, rank_no: num(r.rank_no), points: num(r.points), badges: num(r.badges) }))
  const top = rows.filter((r) => r.rank_no <= 3).slice(0, 3)
  const me = rows.find((r) => r.is_me)

  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams()
    const merged = { period, subject: subjectId ?? undefined, class: classId ?? undefined, ...patch }
    Object.entries(merged).forEach(([k, v]) => v && v !== 'all' && p.set(k, v))
    const s = p.toString()
    return `/leaderboard${s ? `?${s}` : ''}`
  }

  const podiumOrder = [top[1], top[0], top[2]].filter(Boolean)

  return (
    <>
      <PageHeader title="Leaderboard" description="Friendly competition among BSIT questers. Climb by completing quests, challenges and labs." icon={Trophy} />

      <div className="mb-6 space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Period">
          <Chip href={href({ period: 'all' })} active={period === 'all'}>All time</Chip>
          <Chip href={href({ period: 'month' })} active={period === 'month'}>Last 30 days</Chip>
          <Chip href={href({ period: 'week' })} active={period === 'week'}>This week</Chip>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Scope">
          <Chip href={href({ subject: undefined })} active={!subjectId}>All subjects</Chip>
          {(subjects as Pick<Subject, 'id' | 'name' | 'short_name'>[] ?? []).map((s) => (
            <Chip key={s.id} href={href({ subject: s.id })} active={subjectId === s.id}>{s.name}</Chip>
          ))}
        </div>
        {classes.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Class">
            <Chip href={href({ class: undefined })} active={!classId}>Everyone</Chip>
            {classes.map((c) => <Chip key={c.id} href={href({ class: c.id })} active={classId === c.id}>{c.name}</Chip>)}
          </div>
        )}
      </div>

      {!profile.show_on_leaderboard && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <EyeOff className="size-4 shrink-0" aria-hidden="true" /> You&apos;re hidden from public rankings. Only you can see your position. <Link href="/profile" className="font-semibold text-indigo-700 hover:underline">Change</Link>
        </p>
      )}

      {error ? (
        <EmptyState icon={Trophy} title="Leaderboard unavailable" description={error.message} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Trophy} title="No rankings yet" description="Be the first on the board — complete a quest to earn XP!" />
      ) : (
        <>
          {/* Podium */}
          {top.length > 0 && (
            <section aria-label="Top 3" className="relative isolate mb-6 grid grid-cols-3 items-end gap-2 overflow-hidden rounded-xl border border-line bg-panel/60 px-3 pt-8 sm:gap-4 sm:px-8">
              <div aria-hidden="true" className="arena-floor -z-10 opacity-40" />
              <div aria-hidden="true" className="absolute top-0 left-1/2 -z-10 size-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-gold/20 blur-3xl" />
              {podiumOrder.map((r) => {
                const place = r.rank_no
                const h = place === 1 ? 'h-36 sm:h-44' : place === 2 ? 'h-24 sm:h-32' : 'h-20 sm:h-24'
                const c = place === 1 ? '#ffc53d' : place === 2 ? '#dfe5f2' : '#f0a45d'
                return (
                  <div key={`${r.rank_no}-${r.display_name}`} className={cn('flex flex-col items-center animate-rise', place === 1 ? 'order-2 [animation-delay:300ms]' : place === 2 ? 'order-1 [animation-delay:150ms]' : 'order-3')}>
                    {place === 1 && <Crown className="mb-1 size-8 text-gold animate-float drop-shadow-[0_0_10px_#ffc53d]" aria-hidden="true" />}
                    <RankEmblem level={r.level} size={place === 1 ? 'lg' : 'md'} animated={place === 1} className={cn(r.is_me && 'rounded-full ring-2 ring-lime ring-offset-4 ring-offset-arena')} />
                    <p className="mt-2 max-w-full truncate text-center font-display text-sm font-bold text-white uppercase">{r.display_name}{r.is_me && ' (you)'}</p>
                    <p className="font-mono text-xs" style={{ color: c }}>{formatNumber(r.points)} XP</p>
                    <div className={cn('mt-3 grid w-full place-items-start justify-center rounded-t-md pt-3 font-display text-4xl font-bold', h)}
                      style={{ background: `linear-gradient(180deg, ${c}40, ${c}08)`, borderTop: `3px solid ${c}`, color: c, textShadow: `0 0 18px ${c}` }}>
                      {place}
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          <section className="card overflow-hidden" aria-label="Rankings">
            <ol className="divide-y divide-indigo-50">
              {rows.map((r) => (
                <li key={`${r.rank_no}-${r.display_name}-${r.is_me}`} className={cn('flex items-center gap-3 px-4 py-3 transition hover:bg-indigo-50/60 sm:px-5', r.is_me && 'bg-lime/10 shadow-[inset_3px_0_0_#c4ff3d]')}>
                  <span className={cn('w-8 text-center font-display text-lg font-bold', r.rank_no <= 3 ? 'text-gold' : 'text-slate-400')}>{r.rank_no}</span>
                  <RankEmblem level={r.level} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.display_name}{r.is_me && <Pill tone="indigo" className="ml-2">You</Pill>}</p>
                    <p className="text-xs text-slate-500">Lv {r.level}{r.year_level ? ` · Year ${r.year_level}` : ''}{r.section ? ` · ${r.section}` : ''}</p>
                  </div>
                  <span className="hidden items-center gap-1 text-sm text-slate-500 sm:flex"><Medal className="size-4" aria-hidden="true" />{r.badges}</span>
                  <span className="w-24 text-right font-display text-lg font-bold text-white">{formatNumber(r.points)}<span className="ml-0.5 text-xs text-slate-500">XP</span></span>
                </li>
              ))}
            </ol>
          </section>
          {me && <p className="mt-4 text-center text-sm text-slate-600">You are ranked <strong>#{me.rank_no}</strong> with {formatNumber(me.points)} XP.</p>}
        </>
      )}
    </>
  )
}
