import Link from 'next/link'
import { HeartHandshake, Radar, Wrench } from 'lucide-react'
import { KIND_LABEL } from '@/lib/question-format'
import type { QuestionKind } from '@/lib/types'
import { cn, formatDate, num } from '@/lib/utils'

export interface WatchRow {
  student_id: string
  student_code: string
  display_name: string
  class_name: string | null
  last_active_date: string | null
  attempts_14d: number
  avg_14d: number | null
  fails_in_row: number
  reasons: string[]
}

export interface RadarRow {
  question_id: string
  quest_id: string
  quest_title: string
  subject_name: string
  subject_color: string
  prompt: string
  kind: QuestionKind
  responses: number
  correct: number
  p_value: number
}

const REASON_TONE: Record<string, string> = {
  'Low scores': 'bg-red-100 text-red-800 ring-red-500/30',
  'Failed 3 in a row': 'bg-orange-100 text-orange-800 ring-orange-500/30',
  'Inactive 7+ days': 'bg-amber-100 text-amber-900 ring-amber-500/30',
  'Never played': 'bg-slate-100 text-slate-700 ring-slate-300/50',
}

/** Students who may be discouraged or falling behind (docx: monitor lower-ranked users). */
export function WatchlistPanel({ rows, error }: { rows: WatchRow[]; error?: string }) {
  return (
    <section className="card overflow-hidden" aria-labelledby="watch-h">
      <header className="flex items-start gap-3 border-b border-line p-5">
        <span className="chamfer-sm grid size-10 shrink-0 place-items-center bg-hot/15 text-hot"><HeartHandshake className="size-5" aria-hidden="true" /></span>
        <div className="flex-1">
          <h2 id="watch-h" className="font-display text-lg font-bold text-white uppercase">Encouragement watchlist</h2>
          <p className="text-sm text-slate-600">Students who may need a nudge: inactive, low recent scores, or repeated fails. Reach out early, before the exam.</p>
        </div>
        <span className="font-display text-2xl font-bold text-hot">{rows.length}</span>
      </header>
      {error ? (
        <p className="p-5 text-sm text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-sm text-slate-600">Nobody flagged right now. Everyone is active and passing. 🎉</p>
      ) : (
        <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
          {rows.map((r) => (
            <li key={r.student_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {r.display_name || 'Student'} <span className="font-mono text-xs text-slate-500">{r.student_code}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {r.class_name ?? 'No class yet'} · last active {r.last_active_date ? formatDate(r.last_active_date) : 'never'}
                  {num(r.attempts_14d) > 0 && ` · ${num(r.attempts_14d)} attempts, avg ${num(r.avg_14d).toFixed(0)}% (14d)`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {r.reasons.map((x) => (
                  <span key={x} className={cn('rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase ring-1 ring-inset', REASON_TONE[x] ?? REASON_TONE['Never played'])}>{x}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Hardest items among my students: where to re-teach next. */
export function RadarPanel({ rows, error }: { rows: RadarRow[]; error?: string }) {
  return (
    <section className="card overflow-hidden" aria-labelledby="radar-h">
      <header className="flex items-start gap-3 border-b border-line p-5">
        <span className="chamfer-sm grid size-10 shrink-0 place-items-center bg-cyan/15 text-cyan"><Radar className="size-5" aria-hidden="true" /></span>
        <div className="flex-1">
          <h2 id="radar-h" className="font-display text-lg font-bold text-white uppercase">Remediation radar</h2>
          <p className="text-sm text-slate-600">The questions your students miss most (at least 3 answers). A low p-value means re-teach this topic or fix the item.</p>
        </div>
      </header>
      {error ? (
        <p className="p-5 text-sm text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-sm text-slate-600">Not enough answers yet. Items show up once at least 3 students have answered them.</p>
      ) : (
        <ol className="divide-y divide-line">
          {rows.map((r, i) => {
            const p = num(r.p_value)
            const color = p < 0.3 ? '#ff3d7f' : p < 0.6 ? '#ffc53d' : '#c4ff3d'
            return (
              <li key={r.question_id} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 shrink-0 text-center font-display font-bold text-slate-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-slate-900">{r.prompt}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span className="size-1.5 rotate-45" style={{ background: r.subject_color }} />{r.subject_name} · {r.quest_title} · {KIND_LABEL[r.kind]}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-slate-100">
                        <div className="h-full" style={{ width: `${Math.max(4, p * 100)}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
                      </div>
                      <span className="w-24 text-right font-mono text-xs" style={{ color }}>p = {p.toFixed(2)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">{num(r.correct)}/{num(r.responses)} correct</p>
                  </div>
                  <Link href={`/instructor/content/quests/${r.quest_id}`} className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:text-white">
                    <Wrench className="size-3.5" aria-hidden="true" /> Fix
                  </Link>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
