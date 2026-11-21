import type { EarnedBadge, Option, QuestionKind } from '@/lib/types'

export interface ByteQuestion {
  id: string
  kind: QuestionKind
  prompt: string
  code: string | null
  options: Option[]
  topic: string | null
  difficulty: number
  points: number
  subject: string
  color: string
}

export interface CheckinStatus {
  today: string
  claimed: boolean
  cycle_day: number
  xp_today: number
  byte_state: 'locked' | 'none' | 'open' | 'correct' | 'wrong'
  byte: ByteQuestion | null
  total: number
  streak: number
  best_streak: number
  rewards: number[]
  days: string[]
}

export interface Unlock { code: string; kind: 'title' | 'frame'; name: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' }

export interface ClaimResult extends CheckinStatus {
  claimed_now: boolean
  xp?: number
  crate?: Unlock | null
  unlocked?: Unlock[]
  new_badges?: EarnedBadge[]
}

export interface ByteResult {
  correct: boolean
  bonus_xp: number
  answer: { value?: string }
  explanation: string
  unlocked: Unlock[]
  new_badges: EarnedBadge[]
}

export interface CatalogItem {
  code: string
  kind: 'title' | 'frame'
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlock_type: 'checkins' | 'byte' | 'crate'
  threshold: number
}
