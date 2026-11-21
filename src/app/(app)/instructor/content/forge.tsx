'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Check, CheckCircle2, CircleDot, ClipboardCheck, Clock, Code2,
  Copy, Crown, Eye, FlaskConical, HelpCircle, ListChecks, Loader2, Plus, Rocket, Save, Skull, Trash2, Type, X, Zap,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { QuestionView } from '@/components/game/question-view'
import { Button, LinkButton } from '@/components/ui/button'
import {
  blankQuestion, convertKind, KIND_META, newKey, newOptionId, questIssues, questionIssues, toPreview,
  type ForgeQuest, type ForgeQuestion,
} from '@/lib/forge'
import type { QuestionKind, QuestType, Response, Subject } from '@/lib/types'
import { cn } from '@/lib/utils'
import { deleteQuest, saveQuestBundle } from '../actions'

const KIND_ICON: Record<QuestionKind, LucideIcon> = {
  mcq: CircleDot, truefalse: Check, multi: ListChecks, short: Type, code: Code2, order: ArrowUpDown,
}
const KINDS: QuestionKind[] = ['mcq', 'truefalse', 'multi', 'short', 'code', 'order']

const MODES: { type: QuestType; label: string; icon: LucideIcon; hint: string }[] = [
  { type: 'quiz', label: 'Quiz', icon: HelpCircle, hint: 'Standard round' },
  { type: 'simulation', label: 'Simulation', icon: FlaskConical, hint: 'Hands-on steps' },
  { type: 'challenge', label: 'Boss fight', icon: Crown, hint: 'Timed, harder' },
  { type: 'pretest', label: 'Pretest', icon: ClipboardCheck, hint: 'Once, no answers shown' },
  { type: 'posttest', label: 'Posttest', icon: ClipboardCheck, hint: 'Once, no answers shown' },
]
const DIFF = ['Easy', 'Medium', 'Hard']

const snapshot = (quest: ForgeQuest, questions: ForgeQuestion[]) => JSON.stringify({ quest, questions })

export function QuestForge({ subjects, initialQuest, initialQuestions }: {
  subjects: Subject[]
  initialQuest: ForgeQuest
  initialQuestions: ForgeQuestion[]
}) {
  const router = useRouter()
  const [quest, setQuest] = useState(initialQuest)
  const [questions, setQuestions] = useState(initialQuestions)
  const [selected, setSelected] = useState<string | null>(initialQuestions[0]?.key ?? null)
  const [saved, setSaved] = useState(() => snapshot(initialQuest, initialQuestions))
  const [saving, startSave] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)

  const dirty = snapshot(quest, questions) !== saved
  const subject = subjects.find((s) => s.id === quest.subject_id)
  const accent = subject?.color ?? '#8268ff'
  const isAssessment = quest.type === 'pretest' || quest.type === 'posttest'

  const perQuestion = useMemo(() => new Map(questions.map((q) => [q.key, questionIssues(q)])), [questions])
  const questProblems = questIssues(quest, questions)
  const readyCount = questions.filter((q) => perQuestion.get(q.key)!.length === 0).length
  const allProblems = [
    ...questProblems.map((p) => ({ key: null as string | null, text: p })),
    ...questions.flatMap((q, i) => perQuestion.get(q.key)!.map((p) => ({ key: q.key, text: `Q${i + 1}: ${p}` }))),
  ]
  const totalPoints = questions.reduce((a, q) => a + q.points, 0)

  const patchQuest = (p: Partial<ForgeQuest>) => setQuest((q) => ({ ...q, ...p }))
  const patchQuestion = useCallback((key: string, p: Partial<ForgeQuestion> | ((q: ForgeQuestion) => ForgeQuestion)) =>
    setQuestions((list) => list.map((q) => (q.key === key ? (typeof p === 'function' ? p(q) : { ...q, ...p }) : q))), [])

  const focusQuestion = (key: string) => {
    setSelected(key)
    requestAnimationFrame(() => document.getElementById(`fq-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
  const addQuestion = (kind: QuestionKind) => {
    const q = blankQuestion(kind)
    setQuestions((l) => [...l, q])
    focusQuestion(q.key)
  }
  const move = (i: number, dir: -1 | 1) => setQuestions((l) => {
    const j = i + dir
    if (j < 0 || j >= l.length) return l
    const n = [...l]
    ;[n[i], n[j]] = [n[j], n[i]]
    return n
  })
  const duplicate = (i: number) => {
    const src = questions[i]
    const idMap = new Map(src.options.map((o) => [o.id, src.kind === 'truefalse' ? o.id : newOptionId()]))
    const copy: ForgeQuestion = {
      ...src, key: newKey(), id: undefined,
      options: src.options.map((o) => ({ ...o, id: idMap.get(o.id)! })),
      correct: src.correct.map((id) => idMap.get(id) ?? id),
      accepted: [...src.accepted],
    }
    setQuestions((l) => [...l.slice(0, i + 1), copy, ...l.slice(i + 1)])
    focusQuestion(copy.key)
  }
  const remove = (key: string) => {
    setQuestions((l) => l.filter((q) => q.key !== key))
    if (selected === key) setSelected(null)
  }

  const save = useCallback(() => {
    if (saving) return
    setShowErrors(true)
    const problems = questIssues(quest, questions).length + questions.reduce((a, q) => a + questionIssues(q).length, 0)
    if (problems) {
      toast.error(`Fix ${problems} issue${problems > 1 ? 's' : ''} before saving. See Mission check.`)
      return
    }
    startSave(async () => {
      const res = await saveQuestBundle({ quest, questions })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const nextQuestions = questions.map((q) => ({ ...q, id: res.ids[q.key] ?? q.id }))
      const nextQuest = { ...quest, id: res.questId }
      setQuestions(nextQuestions)
      setQuest(nextQuest)
      setSaved(snapshot(nextQuest, nextQuestions))
      toast.success(quest.id ? 'Quest saved. Students see the changes now.' : 'Quest forged! 🎮')
      if (!quest.id) router.replace(`/instructor/content/quests/${res.questId}`)
      else router.refresh()
    })
  }, [quest, questions, router, saving])

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  // Warn before leaving with unsaved work.
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const current = questions.find((q) => q.key === selected) ?? null
  const currentIndex = current ? questions.indexOf(current) : -1

  return (
    <div className="pb-10">
      {/* ===== Command bar ===== */}
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b border-line bg-arena/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:bg-panel/90 lg:top-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/instructor/content" className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-indigo-100 hover:text-white" aria-label="Back to Quest Forge library">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="hud flex items-center gap-2">
              Quest Forge
              <span className={cn('rounded px-1.5 py-px text-[10px]', quest.is_published ? 'bg-lime/15 text-lime' : 'bg-amber-100 text-amber-800')}>
                {quest.is_published ? '● Live' : 'Draft'}
              </span>
              {dirty && <span className="text-hot">● Unsaved</span>}
            </p>
            <label htmlFor="forge-title" className="sr-only">Quest title</label>
            <input
              id="forge-title"
              value={quest.title}
              onChange={(e) => patchQuest({ title: e.target.value })}
              placeholder="Name your quest…"
              maxLength={120}
              className="w-full bg-transparent font-display text-xl font-bold text-white uppercase placeholder:text-slate-400 focus:outline-none sm:text-2xl"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {quest.id && (
              <>
                <LinkButton href={`/quests/${quest.id}`} variant="outline" size="sm" target="_blank"><Eye className="size-4" aria-hidden="true" /> Playtest</LinkButton>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} aria-label="Delete quest"><Trash2 className="size-4" aria-hidden="true" /></Button>
              </>
            )}
            <Button variant="accent" onClick={save} disabled={saving} className={cn(dirty && 'shine')}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : quest.id ? <Save className="size-4" aria-hidden="true" /> : <Rocket className="size-4" aria-hidden="true" />}
              {saving ? 'Saving…' : quest.id ? 'Save' : 'Forge quest'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {/* ===== Setup ===== */}
          <section className="card p-5 sm:p-6" aria-labelledby="setup-h">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="setup-h" className="text-lg font-bold uppercase">Quest setup</h2>
              <Switch label={quest.is_published ? 'Live for students' : 'Draft (hidden)'} checked={quest.is_published} onChange={(v) => patchQuest({ is_published: v })} />
            </div>

            <FieldLabel>World (subject)</FieldLabel>
            <div className="mb-5 flex flex-wrap gap-2">
              {subjects.map((s) => {
                const on = s.id === quest.subject_id
                return (
                  <button key={s.id} type="button" onClick={() => patchQuest({ subject_id: s.id })} aria-pressed={on}
                    className={cn('chamfer-sm flex items-center gap-2 px-3 py-2 font-display text-sm font-semibold uppercase transition', on ? 'text-arena' : 'bg-panel-2 text-slate-600 ring-1 ring-line ring-inset hover:text-white')}
                    style={on ? { background: s.color, boxShadow: `0 0 18px -4px ${s.color}` } : undefined}>
                    <span className="size-2 rotate-45" style={{ background: on ? '#070818' : s.color }} />{s.name}
                  </button>
                )
              })}
            </div>

            <FieldLabel>Game mode</FieldLabel>
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {MODES.map((m) => {
                const on = quest.type === m.type
                return (
                  <button key={m.type} type="button" aria-pressed={on}
                    onClick={() => patchQuest({ type: m.type, ...(m.type === 'challenge' && !quest.time_limit_seconds ? { time_limit_seconds: 600, difficulty: Math.max(quest.difficulty, 2) } : {}) })}
                    className={cn('group rounded-lg border-2 p-3 text-left transition', on ? 'border-lime bg-lime/10' : 'border-line bg-panel-2 hover:-translate-y-0.5 hover:border-indigo-400')}>
                    <m.icon className={cn('size-5 transition group-hover:scale-110', on ? 'text-lime' : 'text-indigo-700')} aria-hidden="true" />
                    <p className={cn('mt-2 font-display text-sm font-bold uppercase', on ? 'text-white' : 'text-slate-700')}>{m.label}</p>
                    <p className="text-[11px] leading-tight text-slate-500">{m.hint}</p>
                  </button>
                )
              })}
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <FieldLabel>Difficulty</FieldLabel>
                <div className="flex gap-1">
                  {DIFF.map((d, i) => (
                    <button key={d} type="button" onClick={() => patchQuest({ difficulty: i + 1 })} aria-pressed={quest.difficulty === i + 1}
                      className={cn('flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-xs font-semibold transition', quest.difficulty === i + 1 ? 'bg-indigo-600 text-white shadow-glow' : 'bg-panel-2 text-slate-500 ring-1 ring-line hover:text-white')}>
                      <span className="flex">{Array.from({ length: i + 1 }, (_, k) => <Skull key={k} className="size-3.5" aria-hidden="true" />)}</span>{d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="xp">XP reward <span className="text-gold">{quest.xp_reward}</span></FieldLabel>
                <input id="xp" type="range" min={0} max={500} step={5} value={quest.xp_reward} onChange={(e) => patchQuest({ xp_reward: Number(e.target.value) })} className="w-full accent-[#ffc53d]" />
                <div className="flex justify-between font-mono text-[10px] text-slate-500"><span>0</span><span>250</span><span>500</span></div>
              </div>
              <div>
                <FieldLabel htmlFor="timer">
                  Timer <span className="text-cyan">{quest.time_limit_seconds ? `${Math.round(quest.time_limit_seconds / 60)} min` : 'off'}</span>
                </FieldLabel>
                <input id="timer" type="range" min={0} max={60} step={1} value={quest.time_limit_seconds ? Math.round(quest.time_limit_seconds / 60) : 0}
                  onChange={(e) => { const m = Number(e.target.value); patchQuest({ time_limit_seconds: m > 0 ? m * 60 : null }) }} className="w-full accent-[#2de2e6]" />
                <div className="flex justify-between font-mono text-[10px] text-slate-500"><span>off</span><span>30</span><span>60</span></div>
              </div>
            </div>

            <div className="mt-5">
              <FieldLabel htmlFor="desc">Briefing (shown before the quest)</FieldLabel>
              <textarea id="desc" value={quest.description} onChange={(e) => patchQuest({ description: e.target.value })} maxLength={500} rows={2}
                placeholder="What will players practice? e.g. Subnet masks, hosts per subnet and network addresses."
                className="w-full rounded-lg border border-line bg-[#090b20] px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-lime focus:ring-4 focus:ring-lime/15 focus:outline-none" />
            </div>
            {isAssessment && (
              <p className="mt-3 rounded-lg border border-violet-500/30 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                Assessments can be taken <b>once</b>, show <b>no answers</b>, and give a flat 20 XP. They feed the research statistics.
              </p>
            )}
          </section>

          {/* ===== Question stack ===== */}
          <section aria-labelledby="qs-h">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="hud hud-tick">Rounds</p>
                <h2 id="qs-h" className="text-2xl font-bold uppercase">Questions <span className="text-slate-400">({questions.length})</span></h2>
              </div>
              <p className="font-mono text-xs text-slate-500">{totalPoints} pts total</p>
            </div>

            {questions.length === 0 && (
              <div className="card flex flex-col items-center p-10 text-center">
                <Plus className="size-10 text-lime animate-float" aria-hidden="true" />
                <p className="mt-3 font-display text-lg font-bold text-white uppercase">Empty arena</p>
                <p className="text-sm text-slate-600">Pick a question type below to add your first round.</p>
              </div>
            )}

            <ol ref={listRef} className="space-y-3">
              {questions.map((q, i) => {
                const Icon = KIND_ICON[q.kind]
                const issues = perQuestion.get(q.key)!
                const open = q.key === selected
                return (
                  <li key={q.key} id={`fq-${q.key}`} className={cn('card overflow-hidden transition', open ? 'border-lime/60 shadow-glow-lime' : 'hover:border-line-bright')}>
                    <div className="flex items-center gap-3 p-3 pl-4">
                      <button type="button" onClick={() => setSelected(open ? null : q.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
                        <span className="chamfer-sm grid size-9 shrink-0 place-items-center font-display text-sm font-bold text-white" style={{ background: accent }}>{i + 1}</span>
                        <span className="hidden shrink-0 items-center gap-1 rounded-md bg-indigo-100 px-2 py-1 font-mono text-[10px] font-bold text-indigo-800 sm:flex">
                          <Icon className="size-3.5" aria-hidden="true" />{KIND_META[q.kind].short}
                        </span>
                        <span className={cn('min-w-0 flex-1 truncate font-medium', q.prompt ? 'text-slate-800' : 'text-slate-400 italic')}>{q.prompt || 'Untitled question'}</span>
                        {issues.length ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-hot" title={issues.join('\n')}><AlertTriangle className="size-4" aria-hidden="true" />{issues.length}</span>
                        ) : (
                          <CheckCircle2 className="size-5 shrink-0 text-lime" aria-label="Ready" />
                        )}
                      </button>
                      <div className="flex shrink-0 items-center">
                        <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp /></IconBtn>
                        <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === questions.length - 1}><ArrowDown /></IconBtn>
                        <IconBtn label="Duplicate" onClick={() => duplicate(i)}><Copy /></IconBtn>
                        <IconBtn label="Delete question" onClick={() => remove(q.key)} danger><Trash2 /></IconBtn>
                      </div>
                    </div>
                    {open && (
                      <div className="border-t border-line p-4 animate-rise sm:p-5">
                        <QuestionEditor q={q} onChange={(p) => patchQuestion(q.key, p)} issues={showErrors ? issues : []} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>

            {/* Palette */}
            <div className="mt-4 rounded-xl border-2 border-dashed border-line-bright p-4">
              <p className="hud mb-3">Add a round</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {KINDS.map((k) => {
                  const Icon = KIND_ICON[k]
                  return (
                    <button key={k} type="button" onClick={() => addQuestion(k)}
                      className="group flex flex-col items-center gap-1 rounded-lg bg-panel-2 p-3 text-center ring-1 ring-line transition hover:-translate-y-1 hover:bg-indigo-100 hover:ring-lime/60 active:scale-95">
                      <span className="chamfer-sm grid size-10 place-items-center bg-indigo-100 text-indigo-700 transition group-hover:bg-lime group-hover:text-lime-ink">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="font-display text-xs font-bold text-white uppercase">{KIND_META[k].label}</span>
                      <span className="text-[10px] leading-tight text-slate-500">{KIND_META[k].hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        {/* ===== Right rail: preview + mission check ===== */}
        <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
          <section aria-labelledby="pv-h">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="pv-h" className="hud hud-tick">Live preview</h2>
              {current && <span className="font-mono text-[10px] text-slate-500">Round {currentIndex + 1}/{questions.length}</span>}
            </div>
            <PhonePreview key={current?.key ?? 'none'} quest={quest} question={current} index={currentIndex} total={questions.length} accent={accent} isAssessment={isAssessment} />
          </section>

          <section className="card p-5" aria-labelledby="mc-h">
            <div className="flex items-center justify-between">
              <h2 id="mc-h" className="font-display text-base font-bold uppercase">Mission check</h2>
              <span className={cn('font-mono text-xs font-bold', allProblems.length ? 'text-hot' : 'text-lime')}>
                {allProblems.length ? `${allProblems.length} issue${allProblems.length > 1 ? 's' : ''}` : 'READY'}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-sm bg-slate-100">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-lime transition-[width] duration-500"
                style={{ width: `${questions.length ? (readyCount / questions.length) * 100 : 0}%` }} />
            </div>
            <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[
                { l: 'Rounds', v: questions.length },
                { l: 'Points', v: totalPoints },
                { l: 'XP', v: quest.xp_reward },
                { l: 'Est. min', v: Math.max(1, Math.round((questions.length * 45) / 60)) },
              ].map((s) => (
                <div key={s.l} className="rounded-md bg-panel-2 py-2 ring-1 ring-line">
                  <dd className="font-display text-lg font-bold text-white">{s.v}</dd>
                  <dt className="hud text-[9px]">{s.l}</dt>
                </div>
              ))}
            </dl>
            {allProblems.length > 0 && (
              <ul className="mt-4 max-h-56 space-y-1.5 overflow-y-auto text-sm">
                {allProblems.slice(0, 20).map((p, i) => (
                  <li key={i}>
                    <button type="button" disabled={!p.key} onClick={() => { if (p.key) { setShowErrors(true); focusQuestion(p.key) } }}
                      className="flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-slate-700 enabled:hover:bg-red-50">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-hot" aria-hidden="true" />{p.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-slate-500">Tip: <kbd className="rounded bg-panel-2 px-1.5 py-0.5 font-mono ring-1 ring-line">Ctrl</kbd> + <kbd className="rounded bg-panel-2 px-1.5 py-0.5 font-mono ring-1 ring-line">S</kbd> saves.</p>
          </section>
        </aside>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && quest.id && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => setConfirmDelete(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="del-h" className="card chamfer w-full max-w-sm border-red-500/50 p-6 text-center animate-pop" onClick={(e) => e.stopPropagation()}>
            <Trash2 className="mx-auto size-10 text-hot" aria-hidden="true" />
            <h2 id="del-h" className="mt-3 text-2xl font-bold uppercase">Delete this quest?</h2>
            <p className="mt-2 text-sm text-slate-600">“{quest.title}” and its {questions.length} questions will be removed. Students&apos; past attempts keep their scores. This can&apos;t be undone.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep it</Button>
              <Button variant="danger" disabled={deleting} onClick={() => startDelete(async () => { await deleteQuest(quest.id!) })}>
                {deleting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />} Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function QuestionEditor({ q, onChange, issues }: { q: ForgeQuestion; onChange: (p: Partial<ForgeQuestion> | ((q: ForgeQuestion) => ForgeQuestion)) => void; issues: string[] }) {
  const [draftAnswer, setDraftAnswer] = useState('')
  const [showCode, setShowCode] = useState(Boolean(q.code) || q.kind === 'code')
  const id = q.key

  const setOption = (oid: string, text: string) => onChange((x) => ({ ...x, options: x.options.map((o) => (o.id === oid ? { ...o, text } : o)) }))
  const addOption = () => onChange((x) => ({ ...x, options: [...x.options, { id: newOptionId(), text: '' }] }))
  const removeOption = (oid: string) => onChange((x) => ({ ...x, options: x.options.filter((o) => o.id !== oid), correct: x.correct.filter((c) => c !== oid) }))
  const toggleCorrect = (oid: string) => onChange((x) => ({
    ...x,
    correct: x.kind === 'mcq' ? [oid] : x.correct.includes(oid) ? x.correct.filter((c) => c !== oid) : [...x.correct, oid],
  }))
  const moveOption = (i: number, dir: -1 | 1) => onChange((x) => {
    const j = i + dir
    if (j < 0 || j >= x.options.length) return x
    const o = [...x.options]
    ;[o[i], o[j]] = [o[j], o[i]]
    return { ...x, options: o }
  })
  const addAccepted = () => {
    const v = draftAnswer.trim()
    if (!v) return
    onChange((x) => ({ ...x, accepted: x.accepted.includes(v) ? x.accepted : [...x.accepted, v] }))
    setDraftAnswer('')
  }

  const maxOptions = q.kind === 'order' ? 10 : 8
  const inputCls = 'w-full rounded-lg border border-line bg-[#090b20] px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-lime focus:ring-4 focus:ring-lime/15 focus:outline-none'

  return (
    <div className="space-y-5">
      {/* Type switcher */}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Question type">
        {KINDS.map((k) => {
          const Icon = KIND_ICON[k]
          const on = q.kind === k
          return (
            <button key={k} type="button" role="radio" aria-checked={on} onClick={() => !on && onChange((x) => convertKind(x, k))}
              className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-display text-xs font-semibold uppercase transition', on ? 'bg-lime text-lime-ink' : 'bg-panel-2 text-slate-600 ring-1 ring-line hover:text-white')}>
              <Icon className="size-3.5" aria-hidden="true" />{KIND_META[k].label}
            </button>
          )
        })}
      </div>

      <div>
        <FieldLabel htmlFor={`p-${id}`}>Question</FieldLabel>
        <textarea id={`p-${id}`} value={q.prompt} onChange={(e) => onChange({ prompt: e.target.value })} rows={2} maxLength={1000}
          placeholder={q.kind === 'code' ? 'What is printed when this code runs?' : q.kind === 'order' ? 'Arrange the steps of …' : 'Type the question players must answer…'}
          className={cn(inputCls, 'text-base')} autoFocus={!q.prompt} />
      </div>

      {q.kind !== 'code' && !showCode ? (
        <button type="button" onClick={() => setShowCode(true)} className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-white">
          <Code2 className="size-4" aria-hidden="true" /> Add a code snippet
        </button>
      ) : (
        <div>
          <FieldLabel htmlFor={`c-${id}`}>Code snippet {q.kind !== 'code' && <span className="normal-case text-slate-500">(optional)</span>}</FieldLabel>
          <textarea id={`c-${id}`} value={q.code} onChange={(e) => onChange({ code: e.target.value })} rows={4} maxLength={4000} spellCheck={false}
            placeholder={'x = 3\nprint(x * 2)'} className="code-block w-full resize-y focus:border-lime focus:outline-none" />
        </div>
      )}

      {/* Answer editors */}
      {(q.kind === 'mcq' || q.kind === 'multi') && (
        <div>
          <FieldLabel>Choices · {q.kind === 'mcq' ? 'tap the circle to mark the ONE correct answer' : 'tick every correct answer'}</FieldLabel>
          <ul className="space-y-2">
            {q.options.map((o, i) => {
              const on = q.correct.includes(o.id)
              return (
                <li key={o.id} className={cn('flex items-center gap-2 rounded-lg border-2 p-1.5 pl-2 transition', on ? 'border-lime/70 bg-lime/5' : 'border-line bg-panel-2')}>
                  <button type="button" onClick={() => toggleCorrect(o.id)} aria-pressed={on} aria-label={`Mark choice ${i + 1} as correct`}
                    className={cn('grid size-8 shrink-0 place-items-center border-2 transition', q.kind === 'mcq' ? 'rounded-full' : 'rounded-md', on ? 'border-lime bg-lime text-lime-ink' : 'border-line-bright text-transparent hover:border-lime/60')}>
                    <Check className="size-4" strokeWidth={3} />
                  </button>
                  <span className="w-5 shrink-0 text-center font-display text-sm font-bold text-slate-500">{'ABCDEFGH'[i]}</span>
                  <input value={o.text} onChange={(e) => setOption(o.id, e.target.value)} maxLength={500} placeholder={`Choice ${i + 1}`}
                    aria-label={`Choice ${i + 1}`} className="min-w-0 flex-1 bg-transparent py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none" />
                  <IconBtn label={`Remove choice ${i + 1}`} onClick={() => removeOption(o.id)} disabled={q.options.length <= 2} danger><X /></IconBtn>
                </li>
              )
            })}
          </ul>
          {q.options.length < maxOptions && <AddRow onClick={addOption}>Add choice</AddRow>}
        </div>
      )}

      {q.kind === 'truefalse' && (
        <div>
          <FieldLabel>The statement is…</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {(['true', 'false'] as const).map((v) => {
              const on = q.correct[0] === v
              return (
                <button key={v} type="button" onClick={() => onChange({ correct: [v] })} aria-pressed={on}
                  className={cn('chamfer py-4 font-display text-xl font-bold uppercase transition', on ? (v === 'true' ? 'bg-lime text-lime-ink' : 'bg-hot text-white') : 'bg-panel-2 text-slate-500 ring-1 ring-line hover:text-white')}>
                  {v}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {q.kind === 'order' && (
        <div>
          <FieldLabel>Steps in the CORRECT order (players get them shuffled)</FieldLabel>
          <ol className="space-y-2">
            {q.options.map((o, i) => (
              <li key={o.id} className="flex items-center gap-2 rounded-lg border-2 border-line bg-panel-2 p-1.5 pl-2">
                <span className="chamfer-sm grid size-8 shrink-0 place-items-center bg-indigo-600 font-display text-sm font-bold text-white">{i + 1}</span>
                <input value={o.text} onChange={(e) => setOption(o.id, e.target.value)} maxLength={500} placeholder={`Step ${i + 1}`} aria-label={`Step ${i + 1}`}
                  className="min-w-0 flex-1 bg-transparent py-1.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" />
                <IconBtn label="Move up" onClick={() => moveOption(i, -1)} disabled={i === 0}><ArrowUp /></IconBtn>
                <IconBtn label="Move down" onClick={() => moveOption(i, 1)} disabled={i === q.options.length - 1}><ArrowDown /></IconBtn>
                <IconBtn label={`Remove step ${i + 1}`} onClick={() => removeOption(o.id)} disabled={q.options.length <= 2} danger><X /></IconBtn>
              </li>
            ))}
          </ol>
          {q.options.length < maxOptions && <AddRow onClick={addOption}>Add step</AddRow>}
        </div>
      )}

      {(q.kind === 'short' || q.kind === 'code') && (
        <div>
          <FieldLabel htmlFor={`a-${id}`}>Accepted answers (not case-sensitive) · press Enter to add</FieldLabel>
          <div className="flex gap-2">
            <input id={`a-${id}`} value={draftAnswer} onChange={(e) => setDraftAnswer(e.target.value)} maxLength={200}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAccepted() } }}
              placeholder={q.kind === 'code' ? 'e.g. 6' : 'e.g. 255.255.255.192'} className={cn(inputCls, q.kind === 'code' && 'font-mono')} />
            <Button variant="secondary" onClick={addAccepted} aria-label="Add accepted answer"><Plus className="size-4" /></Button>
          </div>
          {q.accepted.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {q.accepted.map((a) => (
                <li key={a} className="flex items-center gap-1 rounded-md bg-lime/10 py-1 pr-1 pl-2.5 font-mono text-sm text-lime ring-1 ring-lime/40 animate-pop">
                  {a}
                  <button type="button" onClick={() => onChange((x) => ({ ...x, accepted: x.accepted.filter((v) => v !== a) }))} aria-label={`Remove ${a}`} className="grid size-5 place-items-center rounded hover:bg-lime/20"><X className="size-3" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor={`t-${id}`}>Topic tag</FieldLabel>
          <input id={`t-${id}`} value={q.topic} onChange={(e) => onChange({ topic: e.target.value })} maxLength={60} placeholder="e.g. Subnetting" className={inputCls} />
        </div>
        <div>
          <FieldLabel>Difficulty</FieldLabel>
          <div className="flex gap-1">
            {DIFF.map((d, i) => (
              <button key={d} type="button" onClick={() => onChange({ difficulty: i + 1 })} aria-pressed={q.difficulty === i + 1}
                className={cn('flex-1 rounded-md py-2 text-xs font-semibold transition', q.difficulty === i + 1 ? 'bg-indigo-600 text-white' : 'bg-panel-2 text-slate-500 ring-1 ring-line hover:text-white')}>{d}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel htmlFor={`pt-${id}`}>Points</FieldLabel>
          <input id={`pt-${id}`} type="number" min={1} max={100} value={q.points} onChange={(e) => onChange({ points: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} className={inputCls} />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor={`e-${id}`}>Explanation (shown in the answer review)</FieldLabel>
        <textarea id={`e-${id}`} value={q.explanation} onChange={(e) => onChange({ explanation: e.target.value })} rows={2} maxLength={1500}
          placeholder="Why is this the right answer? Players learn the most from this part." className={inputCls} />
      </div>

      {issues.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-red-500/40 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {issues.map((p) => <li key={p} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{p}</li>)}
        </ul>
      )}
    </div>
  )
}

function PhonePreview({ quest, question, index, total, accent, isAssessment }: {
  quest: ForgeQuest; question: ForgeQuestion | null; index: number; total: number; accent: string; isAssessment: boolean
}) {
  const [response, setResponse] = useState<Response | undefined>(undefined)
  return (
    <div className="mx-auto w-full max-w-[360px] rounded-[2rem] border-4 border-[#1b1f4e] bg-arena p-3 shadow-[0_30px_60px_-20px_rgb(106_76_255/0.5)]">
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-[#1b1f4e]" aria-hidden="true" />
      <div className="max-h-[560px] overflow-y-auto rounded-2xl bg-[#0a0c22] p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="hud truncate text-[9px]">{quest.title || 'Untitled quest'}</p>
            <p className="font-display text-sm font-bold text-white uppercase">Round {index >= 0 ? index + 1 : '–'} <span className="text-slate-400">/ {total}</span></p>
          </div>
          {quest.time_limit_seconds && (
            <span className="flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-1 font-mono text-[11px] font-bold text-indigo-800">
              <Clock className="size-3" aria-hidden="true" />{Math.round(quest.time_limit_seconds / 60)}:00
            </span>
          )}
        </div>
        <div className="mb-3 flex gap-0.5" aria-hidden="true">
          {Array.from({ length: Math.max(total, 1) }, (_, i) => (
            <span key={i} className="h-1 flex-1 rounded-sm" style={{ background: i === index ? accent : '#20244d' }} />
          ))}
        </div>
        {question ? (
          <div className="rounded-lg border border-line bg-panel p-3 text-sm [&_h2]:text-base">
            <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
              {question.topic && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-800">{question.topic}</span>}
              {!isAssessment && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{DIFF[question.difficulty - 1]} · {question.points} pts</span>}
            </div>
            <QuestionView question={toPreview(question)} response={response} onChange={setResponse} />
          </div>
        ) : (
          <div className="grid h-64 place-items-center text-center text-sm text-slate-500">
            <div><Zap className="mx-auto mb-2 size-8 text-indigo-700" aria-hidden="true" />Select or add a question<br />to preview it here.</div>
          </div>
        )}
      </div>
    </div>
  )
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <span className={cn('relative h-6 w-11 rounded-full transition', checked ? 'bg-lime shadow-glow-lime' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
      {label}
    </button>
  )
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase">{children}</label>
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={cn('grid size-8 place-items-center rounded-md text-slate-500 transition disabled:opacity-25 [&_svg]:size-4', danger ? 'hover:bg-red-50 hover:text-red-700' : 'hover:bg-indigo-100 hover:text-white')}>
      {children}
    </button>
  )
}

function AddRow({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line py-2 text-sm font-semibold text-slate-500 transition hover:border-lime/60 hover:text-lime">
      <Plus className="size-4" aria-hidden="true" />{children}
    </button>
  )
}
