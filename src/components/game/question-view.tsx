'use client'

import { ArrowDown, ArrowUp, Check } from 'lucide-react'
import type { Question, Response } from '@/lib/types'
import { cn } from '@/lib/utils'

const LETTERS = 'ABCDEFGH'

export function isAnswered(q: Question, r: Response | undefined) {
  if (!r) return false
  if (q.kind === 'multi') return (r.values?.length ?? 0) > 0
  if (q.kind === 'order') return Array.isArray(r.order)
  return Boolean(r.value && r.value.trim())
}

export function QuestionView({
  question, response, onChange, onEnter,
}: { question: Question; response: Response | undefined; onChange: (r: Response) => void; onEnter?: () => void }) {
  const q = question
  return (
    <div>
      <h2 className="font-sans text-lg leading-snug font-bold tracking-normal text-white sm:text-xl">{q.prompt}</h2>
      {q.code && <pre className="code-block mt-4"><code>{q.code}</code></pre>}

      <div className="mt-5">
        {(q.kind === 'mcq' || q.kind === 'truefalse') && (
          <div role="radiogroup" aria-label="Answer choices" className={cn('grid gap-2.5', q.kind === 'truefalse' && 'sm:grid-cols-2')}>
            {q.options.map((o, i) => {
              const selected = response?.value === o.id
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ value: o.id })}
                  className={cn(
                    'group flex min-h-14 items-center gap-3 rounded-lg border-2 px-4 py-3 text-left font-medium transition duration-150 active:scale-[0.99]',
                    selected ? 'border-lime bg-lime/10 text-white shadow-glow-lime' : 'border-line bg-panel-2 text-slate-800 hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50',
                  )}
                >
                  <span className={cn('chamfer-sm grid size-8 shrink-0 place-items-center font-display text-sm font-bold transition', selected ? 'bg-lime text-lime-ink animate-pop' : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white')}>
                    {q.kind === 'truefalse' ? (o.id === 'true' ? 'T' : 'F') : LETTERS[i]}
                  </span>
                  <span className="break-words">{o.text}</span>
                </button>
              )
            })}
          </div>
        )}

        {q.kind === 'multi' && (
          <div role="group" aria-label="Select all that apply" className="grid gap-2.5">
            <p className="text-sm font-semibold text-slate-500">Select all that apply</p>
            {q.options.map((o) => {
              const values = response?.values ?? []
              const selected = values.includes(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => onChange({ values: selected ? values.filter((v) => v !== o.id) : [...values, o.id] })}
                  className={cn(
                    'flex min-h-14 items-center gap-3 rounded-lg border-2 px-4 py-3 text-left font-medium transition duration-150 active:scale-[0.99]',
                    selected ? 'border-lime bg-lime/10 text-white' : 'border-line bg-panel-2 text-slate-800 hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50',
                  )}
                >
                  <span className={cn('grid size-7 shrink-0 place-items-center rounded-md border-2', selected ? 'border-lime bg-lime text-lime-ink animate-pop' : 'border-line-bright bg-arena')}>
                    {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  <span className="break-words">{o.text}</span>
                </button>
              )
            })}
          </div>
        )}

        {(q.kind === 'short' || q.kind === 'code') && (
          <div>
            <label htmlFor={`ans-${q.id}`} className="mb-1.5 block text-sm font-semibold text-slate-600">
              {q.kind === 'code' ? 'Type the exact output' : 'Your answer'}
            </label>
            <input
              id={`ans-${q.id}`}
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={response?.value ?? ''}
              onChange={(e) => onChange({ value: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter?.() } }}
              maxLength={200}
              className={cn(
                'h-14 w-full rounded-lg border-2 border-line bg-[#090b20] px-4 text-lg font-semibold text-white transition',
                'focus:border-lime focus:ring-4 focus:ring-lime/15 focus:outline-none',
                q.kind === 'code' && 'font-mono',
              )}
              placeholder={q.kind === 'code' ? 'e.g. 42' : 'Type your answer'}
            />
            <p className="mt-1.5 text-xs text-slate-500">Not case-sensitive. Extra spaces are ignored.</p>
          </div>
        )}

        {q.kind === 'order' && <OrderList question={q} response={response} onChange={onChange} />}
      </div>
    </div>
  )
}

function OrderList({ question, response, onChange }: { question: Question; response: Response | undefined; onChange: (r: Response) => void }) {
  const order = response?.order ?? question.options.map((o) => o.id)
  const byId = new Map(question.options.map((o) => [o.id, o.text]))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange({ order: next })
  }
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-500">Use the arrows to put the items in the correct order (top = first).</p>
      <ol className="space-y-2" aria-label="Items to order">
        {order.map((id, i) => (
          <li key={id} className="flex items-center gap-2 rounded-lg border-2 border-line bg-panel-2 p-2 pl-3 transition animate-rise hover:border-indigo-400">
            <span className="chamfer-sm grid size-8 shrink-0 place-items-center bg-indigo-600 font-display text-sm font-bold text-white">{i + 1}</span>
            <span className="min-w-0 flex-1 font-mono text-sm font-semibold break-words whitespace-pre-wrap sm:text-base">{byId.get(id)}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move "${byId.get(id)}" up`} className="grid size-11 place-items-center rounded-xl text-indigo-700 hover:bg-indigo-100 disabled:opacity-30">
              <ArrowUp className="size-5" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Move "${byId.get(id)}" down`} className="grid size-11 place-items-center rounded-xl text-indigo-700 hover:bg-indigo-100 disabled:opacity-30">
              <ArrowDown className="size-5" />
            </button>
          </li>
        ))}
      </ol>
      {!response?.order && (
        <button type="button" onClick={() => onChange({ order })} className="mt-3 text-sm font-semibold text-indigo-700 hover:underline">
          This order looks right — lock it in
        </button>
      )}
    </div>
  )
}
