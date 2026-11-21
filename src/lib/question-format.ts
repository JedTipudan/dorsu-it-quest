import type { QuestionKind } from './types'

export const KIND_LABEL: Record<QuestionKind, string> = {
  mcq: 'Multiple choice',
  truefalse: 'True / False',
  multi: 'Select all that apply',
  short: 'Short answer',
  code: 'Code output (tracing)',
  order: 'Ordering (simulation)',
}
