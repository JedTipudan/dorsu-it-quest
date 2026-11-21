'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Lightbulb, Loader2, RefreshCw, XCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { checkSubnet, type SubnetCheck } from '../../actions'

type Level = 'easy' | 'medium' | 'hard'
const PREFIXES: Record<Level, number[]> = { easy: [24, 25, 26], medium: [26, 27, 28, 29, 30], hard: [17, 18, 19, 20, 21, 22, 23, 27, 28, 29] }

function randomProblem(level: Level) {
  const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
  const kind = r(0, 2)
  const first = kind === 0 ? 10 : kind === 1 ? 172 : 192
  const second = kind === 0 ? r(0, 255) : kind === 1 ? r(16, 31) : 168
  const ip = `${first}.${second}.${r(0, 255)}.${r(1, 254)}`
  const list = PREFIXES[level]
  return { ip, prefix: list[r(0, list.length - 1)] }
}

const FIELDS = [
  { key: 'network', label: 'Network address', placeholder: 'e.g. 192.168.1.0' },
  { key: 'broadcast', label: 'Broadcast address', placeholder: 'e.g. 192.168.1.255' },
  { key: 'first', label: 'First usable host', placeholder: 'e.g. 192.168.1.1' },
  { key: 'last', label: 'Last usable host', placeholder: 'e.g. 192.168.1.254' },
  { key: 'hosts', label: 'Number of usable hosts', placeholder: 'e.g. 254' },
] as const
type FieldKey = (typeof FIELDS)[number]['key']
const EMPTY: Record<FieldKey, string> = { network: '', broadcast: '', first: '', last: '', hosts: '' }

export default function SubnetTrainer() {
  const [level, setLevel] = useState<Level>('easy')
  const [problem, setProblem] = useState<{ ip: string; prefix: number } | null>(() => randomProblem('easy'))
  const [answers, setAnswers] = useState(EMPTY)
  const [result, setResult] = useState<SubnetCheck | null>(null)
  const [streak, setStreak] = useState(0)
  const [solved, setSolved] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [pending, startTransition] = useTransition()

  const next = (lvl = level) => {
    setProblem(randomProblem(lvl))
    setAnswers(EMPTY)
    setResult(null)
    setShowHint(false)
  }

  const check = () => {
    if (!problem) return
    if (Object.values(answers).some((v) => !v.trim())) {
      toast.error('Fill in all five fields first.')
      return
    }
    startTransition(async () => {
      const res = await checkSubnet({ ...problem, ...answers })
      if (res.error || !res.data) {
        toast.error(res.error ?? 'Could not check your answer.')
        return
      }
      setResult(res.data)
      if (res.data.correct) {
        setStreak((s) => s + 1)
        setSolved((s) => s + 1)
        toast.success(res.data.xp_earned ? `Correct! +${res.data.xp_earned} XP` : 'Correct! (daily lab XP cap reached)')
        res.data.new_badges.forEach((b) => toast.success(`Badge unlocked: ${b.name}`))
      } else {
        setStreak(0)
      }
    })
  }

  const blockSize = problem ? 2 ** ((32 - problem.prefix) % 8 || 8) : 0

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Host address</p>
            <p className="font-mono text-3xl font-bold text-indigo-700 sm:text-4xl" aria-live="polite">
              {problem ? <>{problem.ip}<span className="text-orange-500">/{problem.prefix}</span></> : '…'}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label htmlFor="level" className="text-xs">Difficulty</Label>
              <Select id="level" value={level} onChange={(e) => { const l = e.target.value as Level; setLevel(l); next(l) }} className="h-10 w-32 text-sm">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="h-10" onClick={() => next()} aria-label="New problem"><RefreshCw className="size-4" aria-hidden="true" /> New</Button>
          </div>
        </div>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (result) next(); else check() }}>
          {FIELDS.map((f) => {
            const ok = result?.fields[f.key]
            return (
              <div key={f.key} className={f.key === 'hosts' ? 'sm:col-span-2' : ''}>
                <Label htmlFor={f.key}>{f.label}</Label>
                <div className="relative">
                  <Input
                    id={f.key}
                    value={answers[f.key]}
                    onChange={(e) => setAnswers((a) => ({ ...a, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    inputMode={f.key === 'hosts' ? 'numeric' : 'decimal'}
                    autoComplete="off"
                    readOnly={Boolean(result)}
                    aria-invalid={result ? !ok : undefined}
                    className={cn('pr-10 font-mono', result && (ok ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'))}
                  />
                  {result && (ok
                    ? <CheckCircle2 className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-emerald-500" aria-label="Correct" />
                    : <XCircle className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-red-500" aria-label="Incorrect" />)}
                </div>
                {result && !ok && (
                  <p className="mt-1 font-mono text-sm text-emerald-700">Answer: {String(result.expected[f.key])}</p>
                )}
              </div>
            )
          })}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {result ? (
              <Button type="submit" variant={result.correct ? 'success' : 'primary'} size="lg">Next problem <RefreshCw className="size-4" aria-hidden="true" /></Button>
            ) : (
              <Button type="submit" variant="accent" size="lg" disabled={pending || !problem}>
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Check answer
              </Button>
            )}
            {!result && (
              <Button variant="ghost" size="lg" onClick={() => setShowHint((s) => !s)}><Lightbulb className="size-4" aria-hidden="true" /> {showHint ? 'Hide hint' : 'Hint'}</Button>
            )}
          </div>
        </form>

        {showHint && problem && !result && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 animate-rise">
            <p className="font-semibold">Hint for /{problem.prefix}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Host bits = 32 − {problem.prefix} = {32 - problem.prefix}, so usable hosts = 2<sup>{32 - problem.prefix}</sup> − 2.</li>
              <li>The interesting octet is octet {Math.min(4, Math.floor(problem.prefix / 8) + 1)}; subnets go up in blocks of {blockSize}.</li>
              <li>Find the block that contains the host: that start is the network, the next block − 1 is the broadcast.</li>
            </ul>
          </div>
        )}

        {result && (
          <div className={cn('mt-5 rounded-xl p-4 text-sm animate-rise', result.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-indigo-50 text-indigo-900')}>
            <p className="font-semibold">{result.correct ? 'Perfect subnetting!' : 'Not quite — compare with the answers above.'}</p>
            <p className="mt-1 font-mono">Subnet mask: {result.expected.mask} · Range: {result.expected.first} – {result.expected.last}</p>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <div className="card grid grid-cols-2 gap-3 p-4 text-center">
          <div><p className="font-display text-3xl font-bold text-indigo-700">{solved}</p><p className="text-xs text-slate-500">Solved this session</p></div>
          <div><p className="font-display text-3xl font-bold text-orange-600">{streak}</p><p className="text-xs text-slate-500">Current streak</p></div>
        </div>
        <div className="card p-4 text-sm">
          <p className="flex items-center gap-1.5 font-bold"><Zap className="size-4 text-orange-500" aria-hidden="true" /> Rewards</p>
          <p className="mt-1 text-slate-600">+10 XP per fully correct problem (up to 150 XP per day). Solve 10 to earn the <strong>Subnet Ninja</strong> badge.</p>
        </div>
        <div className="card p-4 text-sm">
          <p className="font-bold">Quick reference</p>
          <table className="mt-2 w-full font-mono text-xs">
            <thead><tr className="text-left text-slate-500"><th className="py-1">CIDR</th><th>Mask</th><th className="text-right">Hosts</th></tr></thead>
            <tbody>
              {[[24, '255.255.255.0', 254], [25, '255.255.255.128', 126], [26, '255.255.255.192', 62], [27, '255.255.255.224', 30], [28, '255.255.255.240', 14], [29, '255.255.255.248', 6], [30, '255.255.255.252', 2]].map(([c, m, h]) => (
                <tr key={c} className="border-t border-indigo-50"><td className="py-1">/{c}</td><td>{m}</td><td className="text-right">{h}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  )
}
