// Quest Forge: the structured (non-text) quest editor model, shared by the client editor
// and the server action so validation is identical on both sides.
import type { Answer, Option, Question, QuestionKind, QuestType } from './types'

export interface ForgeQuestion {
  /** Stable client key (React list key); equals the DB id for saved questions. */
  key: string
  id?: string
  kind: QuestionKind
  prompt: string
  code: string
  topic: string
  difficulty: number
  points: number
  explanation: string
  /** mcq / multi: choices · order: items in the CORRECT order · truefalse: fixed T/F. */
  options: Option[]
  /** mcq / truefalse: one id · multi: one or more ids. */
  correct: string[]
  /** short / code: accepted answers. */
  accepted: string[]
}

export interface ForgeQuest {
  id?: string
  subject_id: string
  title: string
  description: string
  type: QuestType
  difficulty: number
  xp_reward: number
  time_limit_seconds: number | null
  is_published: boolean
}

export const newKey = () => 'k' + Math.random().toString(36).slice(2, 10)
export const newOptionId = () => 'o' + Math.random().toString(36).slice(2, 8)

const TF: Option[] = [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }]

export function blankQuestion(kind: QuestionKind): ForgeQuestion {
  const base = { key: newKey(), kind, prompt: '', code: '', topic: '', difficulty: 1, points: 10, explanation: '', accepted: [] as string[] }
  switch (kind) {
    case 'truefalse':
      return { ...base, options: TF, correct: ['true'] }
    case 'mcq':
    case 'multi': {
      const opts = [0, 1, 2, 3].map(() => ({ id: newOptionId(), text: '' }))
      return { ...base, options: opts, correct: [opts[0].id] }
    }
    case 'order':
      return { ...base, options: [0, 1, 2].map(() => ({ id: newOptionId(), text: '' })), correct: [] }
    case 'short':
    case 'code':
      return { ...base, options: [], correct: [] }
  }
}

/** Switch a question's type while keeping as much of the author's work as possible. */
export function convertKind(q: ForgeQuestion, kind: QuestionKind): ForgeQuestion {
  const fresh = blankQuestion(kind)
  const keep = { key: q.key, id: q.id, prompt: q.prompt, code: q.code, topic: q.topic, difficulty: q.difficulty, points: q.points, explanation: q.explanation }
  const hadChoices = (q.kind === 'mcq' || q.kind === 'multi' || q.kind === 'order') && q.options.length >= 2
  if ((kind === 'mcq' || kind === 'multi' || kind === 'order') && hadChoices) {
    const correct = kind === 'order' ? [] : kind === 'mcq' ? [q.correct[0] ?? q.options[0].id] : q.correct.length ? q.correct : [q.options[0].id]
    return { ...fresh, ...keep, options: q.options, correct }
  }
  if ((kind === 'short' || kind === 'code') && (q.kind === 'short' || q.kind === 'code')) return { ...fresh, ...keep, accepted: q.accepted }
  return { ...fresh, ...keep }
}

/** DB row (+ answer key) → editor model. */
export function fromDb(q: Question & { explanation?: string }, answer: Record<string, unknown> | null): ForgeQuestion {
  const a = (answer ?? {}) as { value?: string; values?: string[]; order?: string[]; accepted?: string[] }
  const base = {
    key: q.id, id: q.id, kind: q.kind, prompt: q.prompt, code: q.code ?? '', topic: q.topic ?? '',
    difficulty: q.difficulty, points: q.points, explanation: q.explanation ?? '', accepted: [] as string[],
  }
  switch (q.kind) {
    case 'truefalse':
      return { ...base, options: TF, correct: [a.value ?? 'true'] }
    case 'mcq':
      return { ...base, options: q.options, correct: a.value ? [a.value] : [] }
    case 'multi':
      return { ...base, options: q.options, correct: a.values ?? [] }
    case 'order': {
      const byId = new Map(q.options.map((o) => [o.id, o]))
      const ordered = (a.order ?? q.options.map((o) => o.id)).map((id) => byId.get(id)).filter(Boolean) as Option[]
      return { ...base, options: ordered, correct: [] }
    }
    default:
      return { ...base, options: [], correct: [], accepted: a.accepted ?? [] }
  }
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Editor model → what is stored (options shown to students + the secret answer key). */
export function toDb(q: ForgeQuestion): { options: Option[]; answer: Answer } {
  const clean = q.options.map((o) => ({ id: o.id, text: o.text.trim() }))
  switch (q.kind) {
    case 'truefalse':
      return { options: TF, answer: { value: q.correct[0] === 'false' ? 'false' : 'true' } }
    case 'mcq':
      return { options: clean, answer: { value: q.correct[0] } }
    case 'multi':
      return { options: clean, answer: { values: q.correct.filter((id) => clean.some((o) => o.id === id)) } }
    case 'order': {
      let display = shuffled(clean)
      if (display.every((o, i) => o.id === clean[i].id)) display = [...clean].reverse()
      return { options: display, answer: { order: clean.map((o) => o.id) } }
    }
    default:
      return { options: [], answer: { accepted: q.accepted.map((s) => s.trim()).filter(Boolean) } }
  }
}

/** Human-readable problems that block saving (empty array = ready). */
export function questionIssues(q: ForgeQuestion): string[] {
  const issues: string[] = []
  if (q.prompt.trim().length < 5) issues.push('Write a question prompt (at least 5 characters).')
  if (q.kind === 'code' && !q.code.trim()) issues.push('Add the code snippet students will trace.')
  if (q.points < 1 || q.points > 100) issues.push('Points must be between 1 and 100.')
  if (q.kind === 'mcq' || q.kind === 'multi' || q.kind === 'order') {
    const filled = q.options.filter((o) => o.text.trim())
    if (filled.length !== q.options.length) issues.push('Fill in or remove empty choices.')
    if (q.options.length < 2) issues.push('Add at least two choices.')
    if (q.options.length > (q.kind === 'order' ? 10 : 8)) issues.push(`Use at most ${q.kind === 'order' ? 10 : 8} choices.`)
    const texts = filled.map((o) => o.text.trim().toLowerCase())
    if (new Set(texts).size !== texts.length) issues.push('Two choices have the same text.')
  }
  if (q.kind === 'mcq' && q.correct.filter((id) => q.options.some((o) => o.id === id)).length !== 1) issues.push('Mark exactly one correct choice.')
  if (q.kind === 'multi' && q.correct.filter((id) => q.options.some((o) => o.id === id)).length < 1) issues.push('Mark at least one correct choice.')
  if ((q.kind === 'short' || q.kind === 'code') && q.accepted.filter((s) => s.trim()).length === 0) issues.push('Add at least one accepted answer.')
  return issues
}

export function questIssues(quest: ForgeQuest, questions: ForgeQuestion[]): string[] {
  const issues: string[] = []
  if (quest.title.trim().length < 3) issues.push('Give the quest a title (at least 3 characters).')
  if (!quest.subject_id) issues.push('Choose a subject.')
  if (quest.is_published && questions.length === 0) issues.push('A live quest needs at least one question.')
  return issues
}

/** Turns an editor question into the shape the student QuestionView renders (for live preview). */
export function toPreview(q: ForgeQuestion): Question {
  const opts = q.kind === 'truefalse' ? TF : q.options.map((o, i) => ({ id: o.id, text: o.text || `Choice ${i + 1}` }))
  return {
    id: q.key, kind: q.kind, prompt: q.prompt || 'Your question will appear here…', code: q.code || null,
    options: q.kind === 'order' ? [...opts].reverse() : opts, topic: q.topic || null, difficulty: q.difficulty, points: q.points,
  }
}

export const KIND_META: Record<QuestionKind, { label: string; short: string; hint: string }> = {
  mcq: { label: 'Multiple choice', short: 'MCQ', hint: 'One correct answer' },
  truefalse: { label: 'True / False', short: 'T/F', hint: 'Quick fact check' },
  multi: { label: 'Select all', short: 'MULTI', hint: 'Several correct answers' },
  short: { label: 'Short answer', short: 'TYPE', hint: 'Student types the answer' },
  code: { label: 'Code trace', short: 'CODE', hint: 'Predict the output' },
  order: { label: 'Ordering sim', short: 'ORDER', hint: 'Put steps in sequence' },
}
