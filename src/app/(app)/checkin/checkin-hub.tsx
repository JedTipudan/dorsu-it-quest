'use client'

import { useMemo, useState, useTransition } from 'react'
import { CalendarCheck, Check, CheckCircle2, Flame, Gift, Lock, Package, Sparkles, Trophy, XCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { CountUp } from '@/components/fx/count-up'
import { BadgeMedal } from '@/components/game/bits'
import { QuestionView } from '@/components/game/question-view'
import { RankEmblem } from '@/components/game/rank-emblem'
import { Button } from '@/components/ui/button'
import { COSMETICS, RARITY } from '@/lib/cosmetics'
import { fxLevel } from '@/lib/motion'
import type { Response } from '@/lib/types'
import { cn } from '@/lib/utils'
import { answerByte, claimCheckin, equipCosmetic } from './actions'
import type { ByteResult, CatalogItem, CheckinStatus, ClaimResult, Unlock } from './types'

async function confetti(colors: string[]) {
  if (fxLevel() !== 'full') return
  const c = (await import('canvas-confetti')).default
  c({ particleCount: 140, spread: 90, origin: { y: 0.4 }, colors })
}

/** YYYY-MM-DD arithmetic in UTC (safe: values are Manila calendar dates from the server). */
function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function CheckinHub({ initial, catalog, owned: initialOwned, equipped: initialEquipped, level }: {
  initial: CheckinStatus
  catalog: CatalogItem[]
  owned: string[]
  equipped: { title: string | null; frame: string | null }
  level: number
}) {
  const [status, setStatus] = useState(initial)
  const [reveal, setReveal] = useState<ClaimResult | null>(null)
  const [opening, setOpening] = useState(false)
  const [owned, setOwned] = useState(() => new Set(initialOwned))
  const [equipped, setEquipped] = useState(initialEquipped)
  const [claiming, startClaim] = useTransition()

  const addOwned = (u?: Unlock[] | null) => {
    if (!u?.length) return
    setOwned((prev) => new Set([...prev, ...u.map((x) => x.code)]))
  }

  const claim = () => startClaim(async () => {
    setOpening(true)
    const res = await claimCheckin()
    if (res.error || !res.data) {
      setOpening(false)
      toast.error(res.error ?? 'Could not check in. Try again.')
      return
    }
    const d = res.data
    // let the crate shake a moment before the reveal (instant when effects are off)
    await new Promise((r) => setTimeout(r, fxLevel() === 'off' ? 0 : 900))
    setOpening(false)
    setStatus(d)
    if (d.claimed_now) {
      addOwned([...(d.unlocked ?? []), ...(d.crate ? [d.crate] : [])])
      setReveal(d)
      confetti(['#c4ff3d', '#ffc53d', '#8268ff', '#2de2e6'])
    }
  })

  return (
    <div className="space-y-6">
      {/* ===== Hero: streak + claim ===== */}
      <section className="card chamfer relative isolate overflow-hidden border-line-bright p-6 sm:p-8">
        <div aria-hidden="true" className="arena-floor -z-10 opacity-50" />
        <div aria-hidden="true" className="absolute -top-24 right-0 -z-10 size-80 rounded-full bg-lime/20 blur-3xl" />
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="hud hud-tick">Daily check-in · {new Date(status.today + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="mt-2 text-4xl font-bold uppercase sm:text-5xl">
              {status.claimed ? <>Checked in <span className="text-lime text-glow-lime">✓</span></> : <>Supply drop <span className="text-lime text-glow-lime">ready</span></>}
            </h1>
            <p className="mt-2 max-w-lg text-slate-600">
              Check in every day you study to collect XP and exclusive gear. Missing a day never resets your track. Then clear the <b className="text-white">Daily Byte</b> to double today&apos;s XP.
            </p>
            <dl className="mt-5 flex flex-wrap gap-3">
              <Stat icon={Flame} label="Streak" value={`${status.streak} day${status.streak === 1 ? '' : 's'}`} color="#ff3d7f" />
              <Stat icon={CalendarCheck} label="Days attended" value={String(status.total)} color="#c4ff3d" />
              <Stat icon={Trophy} label="Best streak" value={String(status.best_streak)} color="#ffc53d" />
            </dl>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={claim} disabled={status.claimed || claiming}
              aria-label={status.claimed ? 'Already checked in today' : 'Open today’s supply drop'}
              className={cn('group relative grid size-40 place-items-center rounded-2xl transition',
                status.claimed ? 'cursor-default' : 'cursor-pointer hover:scale-105 active:scale-95')}>
              {!status.claimed && <span aria-hidden="true" className="absolute inset-0 rounded-2xl bg-lime/30 blur-2xl animate-glow" />}
              <span className={cn('chamfer relative grid size-36 place-items-center border-2', status.claimed ? 'border-line bg-panel-2' : 'border-lime bg-gradient-to-br from-lime/25 to-indigo-600/30', opening && 'animate-shake [animation-iteration-count:3]')}>
                {status.claimed
                  ? <CheckCircle2 className="size-16 text-lime" aria-hidden="true" />
                  : status.cycle_day === 7 ? <Package className="size-16 text-gold drop-shadow-[0_0_12px_#ffc53d]" aria-hidden="true" /> : <Gift className="size-16 text-lime drop-shadow-[0_0_12px_#c4ff3d]" aria-hidden="true" />}
              </span>
            </button>
            {status.claimed ? (
              <p className="font-display text-sm text-slate-600 uppercase">+{status.xp_today} XP today · come back tomorrow</p>
            ) : (
              <Button variant="accent" size="lg" onClick={claim} disabled={claiming} className="shine">
                {claiming ? 'Opening…' : `Claim +${status.rewards[status.cycle_day - 1]} XP`}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ===== 7-day track ===== */}
      <section aria-labelledby="track-h">
        <h2 id="track-h" className="mb-3 text-xl font-bold uppercase">Weekly supply track</h2>
        <ol className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {status.rewards.map((xp, i) => {
            const day = i + 1
            const done = day < status.cycle_day || (status.claimed && day === status.cycle_day)
            const current = day === status.cycle_day && !status.claimed
            const chest = day === 7
            return (
              <li key={day} className={cn('relative flex flex-col items-center rounded-lg border-2 px-1 py-3 text-center transition sm:py-4',
                done ? 'border-lime/50 bg-lime/10' : current ? 'border-lime bg-panel shadow-glow-lime' : 'border-line bg-panel',
                chest && !done && 'border-gold/60')}>
                <span className="hud text-[9px]">Day {day}</span>
                <span className={cn('my-2 grid size-9 place-items-center sm:size-11', done ? 'text-lime' : chest ? 'text-gold' : 'text-indigo-700', current && 'animate-float')}>
                  {done ? <Check className="size-7" strokeWidth={3} aria-hidden="true" /> : chest ? <Package className="size-8" aria-hidden="true" /> : <Gift className="size-7" aria-hidden="true" />}
                </span>
                <span className={cn('font-display text-sm font-bold sm:text-base', chest ? 'text-gold' : 'text-white')}>+{xp}</span>
                {chest && <span className="mt-0.5 hidden font-mono text-[9px] text-gold sm:block">+ CRATE</span>}
                {current && <span className="absolute -top-2 rounded bg-lime px-1.5 font-mono text-[9px] font-bold text-lime-ink">TODAY</span>}
              </li>
            )
          })}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <DailyByte status={status} onDone={(r) => {
          setStatus((s) => ({ ...s, byte_state: r.correct ? 'correct' : 'wrong', xp_today: s.xp_today + r.bonus_xp }))
          addOwned(r.unlocked)
        }} />
        <AttendanceCalendar status={status} />
      </div>

      <Locker catalog={catalog} owned={owned} equipped={equipped} level={level} total={status.total} onEquip={setEquipped} />

      {reveal && <RevealOverlay r={reveal} onClose={() => setReveal(null)} />}
    </div>
  )
}

function Stat({ icon: Icon, label, value, color }: { icon: typeof Flame; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-panel-2 px-3 py-2 ring-1 ring-line">
      <Icon className="size-5" style={{ color }} aria-hidden="true" />
      <div><dd className="font-display text-lg leading-none font-bold text-white">{value}</dd><dt className="hud text-[9px]">{label}</dt></div>
    </div>
  )
}

/* ---------- Daily Byte ---------- */
function DailyByte({ status, onDone }: { status: CheckinStatus; onDone: (r: ByteResult) => void }) {
  const [response, setResponse] = useState<Response | undefined>()
  const [result, setResult] = useState<ByteResult | null>(null)
  const [pending, start] = useTransition()
  const q = status.byte

  const submit = () => start(async () => {
    if (!response) return
    const res = await answerByte(response)
    if (res.error || !res.data) {
      toast.error(res.error ?? 'Could not submit.')
      return
    }
    setResult(res.data)
    onDone(res.data)
    if (res.data.correct) confetti(['#c4ff3d', '#2de2e6'])
  })

  const correctText = result && q ? q.options.find((o) => o.id === result.answer?.value)?.text : null

  return (
    <section className="card overflow-hidden" aria-labelledby="byte-h">
      <header className="flex items-center gap-3 border-b border-line p-5">
        <span className="chamfer-sm grid size-10 place-items-center bg-cyan/15 text-cyan"><Zap className="size-5" aria-hidden="true" /></span>
        <div className="flex-1">
          <h2 id="byte-h" className="font-display text-lg font-bold text-white uppercase">Daily Byte</h2>
          <p className="text-sm text-slate-600">One review question from your weakest world. Answer it right to <b className="text-lime">double</b> today&apos;s XP.</p>
        </div>
      </header>
      <div className="p-5">
        {status.byte_state === 'locked' && (
          <p className="flex items-center gap-2 text-slate-600"><Lock className="size-4" aria-hidden="true" /> Claim today&apos;s supply drop to unlock the Daily Byte.</p>
        )}
        {status.byte_state === 'none' && <p className="text-slate-600">No Daily Byte available today. There are no published quiz questions yet.</p>}
        {(status.byte_state === 'correct' || status.byte_state === 'wrong') && !result && (
          <p className={cn('flex items-center gap-2 font-semibold', status.byte_state === 'correct' ? 'text-lime' : 'text-slate-600')}>
            {status.byte_state === 'correct' ? <><CheckCircle2 className="size-5" aria-hidden="true" /> Cleared! XP doubled today. New byte tomorrow.</> : <><XCircle className="size-5 text-hot" aria-hidden="true" /> Missed today&apos;s byte. A new one drops tomorrow.</>}
          </p>
        )}
        {status.byte_state === 'open' && q && !result && (
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold">
              <span className="rounded px-1.5 py-0.5 text-arena" style={{ background: q.color }}>{q.subject}</span>
              {q.topic && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-800">{q.topic}</span>}
              <span className="text-slate-500">One try only</span>
            </p>
            <QuestionView question={{ ...q }} response={response} onChange={setResponse} />
            <Button variant="accent" className="mt-5 w-full" disabled={!response || pending} onClick={submit}>{pending ? 'Checking…' : 'Lock in answer'}</Button>
          </div>
        )}
        {result && (
          <div className="animate-pop">
            <p className={cn('font-display text-3xl font-bold uppercase animate-slam', result.correct ? 'text-lime text-glow-lime' : 'text-hot')}>
              {result.correct ? `Correct! +${result.bonus_xp} XP` : 'Not quite'}
            </p>
            {!result.correct && correctText && <p className="mt-2 text-sm text-slate-700">Correct answer: <b className="text-lime">{correctText}</b></p>}
            {result.explanation && <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900"><b>Why: </b>{result.explanation}</p>}
            {result.unlocked.length > 0 && <UnlockList items={result.unlocked} />}
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------- Attendance calendar (last 6 weeks) ---------- */
function AttendanceCalendar({ status }: { status: CheckinStatus }) {
  const days = useMemo(() => new Set(status.days), [status.days])
  // 6 full weeks ending this week (Sunday-first)
  const todayDow = new Date(status.today + 'T00:00:00Z').getUTCDay()
  const start = addDays(status.today, -(35 + todayDow))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const attended30 = cells.filter((d) => d > addDays(status.today, -30) && d <= status.today && days.has(d)).length
  return (
    <section className="card p-5" aria-labelledby="cal-h">
      <div className="flex items-end justify-between">
        <h2 id="cal-h" className="font-display text-lg font-bold text-white uppercase">Attendance</h2>
        <p className="font-mono text-xs text-slate-500"><span className="text-lime">{attended30}</span>/30 days</p>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="hud text-[9px]">{d}</span>)}
        {cells.map((d) => {
          const on = days.has(d)
          const isToday = d === status.today
          const future = d > status.today
          return (
            <span key={d} title={`${d}${on ? ' · checked in' : ''}`}
              className={cn('grid aspect-square place-items-center rounded-md font-mono text-[11px] transition',
                on ? 'bg-lime font-bold text-lime-ink shadow-[0_0_10px_-2px_#c4ff3d]' : future ? 'bg-transparent text-slate-300' : 'bg-panel-2 text-slate-500 ring-1 ring-line',
                isToday && 'ring-2 ring-cyan')}>
              {Number(d.slice(8))}
            </span>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- Locker ---------- */
function Locker({ catalog, owned, equipped, level, total, onEquip }: {
  catalog: CatalogItem[]; owned: Set<string>; equipped: { title: string | null; frame: string | null }
  level: number; total: number; onEquip: (e: { title: string | null; frame: string | null }) => void
}) {
  const [tab, setTab] = useState<'title' | 'frame'>('title')
  const [pending, start] = useTransition()
  const items = catalog.filter((c) => c.kind === tab)
  const ownedCount = catalog.filter((c) => owned.has(c.code)).length

  const equip = (code: string | null) => start(async () => {
    const res = await equipCosmetic(tab, code)
    if (res.error) return void toast.error(res.error)
    onEquip({ ...equipped, [tab]: code })
    toast.success(code ? `Equipped ${COSMETICS[code]?.name ?? code}` : 'Unequipped')
  })

  return (
    <section aria-labelledby="locker-h">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hud hud-tick">Exclusives · {ownedCount}/{catalog.length} collected</p>
          <h2 id="locker-h" className="text-2xl font-bold uppercase">Locker</h2>
        </div>
        <div className="flex gap-1 rounded-lg bg-panel-2 p-1 ring-1 ring-line" role="tablist" aria-label="Cosmetic type">
          {(['title', 'frame'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cn('rounded-md px-4 py-1.5 font-display text-sm font-semibold uppercase transition', tab === t ? 'bg-lime text-lime-ink' : 'text-slate-600 hover:text-white')}>
              {t === 'title' ? 'Titles' : 'Frames'}
            </button>
          ))}
        </div>
      </div>
      <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => {
          const have = owned.has(c.code)
          const on = equipped[tab] === c.code
          const r = RARITY[c.rarity]
          const progress = c.unlock_type === 'checkins' && !have ? Math.min(100, (total / c.threshold) * 100) : null
          return (
            <li key={c.code} className={cn('card relative flex items-center gap-4 overflow-hidden p-4 transition', have ? 'card-hover' : 'opacity-70')}
              style={{ borderColor: on ? r.color : have ? `${r.color}55` : undefined, boxShadow: on ? `0 0 0 1px ${r.color}, 0 0 24px -8px ${r.color}` : undefined }}>
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5" style={{ background: r.color }} />
              {tab === 'frame' ? (
                <span className={cn(!have && 'grayscale')}><RankEmblem level={level} size="sm" frame={COSMETICS[c.code]?.ring} /></span>
              ) : (
                <span className="chamfer-sm grid size-10 shrink-0 place-items-center" style={{ background: `${r.color}22`, color: r.color }}>
                  {have ? <Sparkles className="size-5" aria-hidden="true" /> : <Lock className="size-5" aria-hidden="true" />}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-bold text-white uppercase">{c.name}</p>
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: r.color }}>{r.label}</p>
                <p className="truncate text-xs text-slate-500">{c.description}</p>
                {progress !== null && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-sm bg-slate-100"><div className="h-full bg-lime" style={{ width: `${progress}%` }} /></div>
                )}
              </div>
              {have && (
                <button type="button" disabled={pending} onClick={() => equip(on ? null : c.code)}
                  className={cn('shrink-0 rounded-md px-2.5 py-1.5 font-display text-xs font-bold uppercase transition disabled:opacity-50', on ? 'bg-lime text-lime-ink' : 'bg-panel-2 text-slate-700 ring-1 ring-line hover:text-white')}>
                  {on ? 'Equipped' : 'Equip'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function UnlockList({ items }: { items: Unlock[] }) {
  return (
    <ul className="mt-4 flex flex-wrap justify-center gap-2">
      {items.map((u) => (
        <li key={u.code} className="chamfer-sm px-3 py-1.5 font-display text-sm font-bold uppercase animate-pop" style={{ background: `${RARITY[u.rarity].color}22`, color: RARITY[u.rarity].color, boxShadow: `0 0 16px -6px ${RARITY[u.rarity].color}` }}>
          {u.kind === 'frame' ? '◎' : '«»'} {u.name}
        </li>
      ))}
    </ul>
  )
}

/* ---------- Reveal ---------- */
function RevealOverlay({ r, onClose }: { r: ClaimResult; onClose: () => void }) {
  const crate = r.crate
  const color = crate ? RARITY[crate.rarity].color : '#c4ff3d'
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-black/85 p-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="rev-h" onClick={onClose}>
      <div aria-hidden="true" className="absolute size-[34rem] rounded-full opacity-40 blur-3xl animate-glow" style={{ background: color }} />
      <div className="relative w-full max-w-md text-center" onClick={(e) => e.stopPropagation()}>
        <span aria-hidden="true" className="absolute top-10 left-1/2 size-44 -translate-x-1/2 rounded-full border-4 animate-burst" style={{ borderColor: color }} />
        <p className="hud">Day {r.cycle_day} supply drop</p>
        <p id="rev-h" className="mt-3 font-display text-7xl font-bold text-lime text-glow-lime animate-slam">+<CountUp value={r.xp ?? 0} duration={900} /> XP</p>
        {crate && (
          <div className="card chamfer mx-auto mt-6 max-w-xs p-5 animate-pop [animation-delay:350ms]" style={{ borderColor: color, boxShadow: `0 0 40px -10px ${color}` }}>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color }}>{RARITY[crate.rarity].label} {crate.kind} · Supply crate</p>
            <p className="mt-1 font-display text-2xl font-bold text-white uppercase">{crate.name}</p>
            <p className="text-xs text-slate-500">Equip it from your Locker</p>
          </div>
        )}
        {(r.unlocked?.length ?? 0) > 0 && (
          <div className="mt-5">
            <p className="hud text-gold">Milestone unlocked</p>
            <UnlockList items={r.unlocked!} />
          </div>
        )}
        {(r.new_badges?.length ?? 0) > 0 && (
          <div className="mt-5 flex justify-center gap-4">
            {r.new_badges!.map((b) => <div key={b.code} className="flex w-24 flex-col items-center animate-pop"><BadgeMedal icon={b.icon} tier={b.tier} size="sm" /><p className="mt-1 text-xs font-bold text-white">{b.name}</p></div>)}
          </div>
        )}
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600"><Flame className="size-4 text-hot" aria-hidden="true" /> {r.streak}-day check-in streak</p>
        <button type="button" onClick={onClose} className="chamfer mt-6 bg-lime px-8 py-3 font-display font-bold text-lime-ink uppercase shadow-glow-lime">Next: Daily Byte</button>
      </div>
    </div>
  )
}
