export type Role = 'student' | 'instructor' | 'admin'
export type QuestType = 'quiz' | 'simulation' | 'challenge' | 'pretest' | 'posttest'
export type QuestionKind = 'mcq' | 'truefalse' | 'multi' | 'short' | 'order' | 'code'
export type GroupType = 'experimental' | 'control' | 'none'

export interface Profile {
  id: string
  email: string | null
  full_name: string
  display_name: string
  student_code: string
  role: Role
  year_level: number | null
  section: string | null
  xp: number
  streak: number
  best_streak: number
  last_active_date: string | null
  show_on_leaderboard: boolean
  created_at: string
  /** Exclusive cosmetics (null until the daily-checkin upgrade is installed / something is equipped) */
  equipped_title?: string | null
  equipped_frame?: string | null
}

export interface Subject {
  id: string
  slug: string
  name: string
  short_name: string
  description: string
  icon: string
  color: string
  sort_order: number
}

export interface Quest {
  id: string
  subject_id: string
  title: string
  description: string
  type: QuestType
  difficulty: number
  xp_reward: number
  time_limit_seconds: number | null
  sort_order: number
  is_published: boolean
}

export interface Option {
  id: string
  text: string
}

export interface Question {
  id: string
  quest_id?: string
  kind: QuestionKind
  prompt: string
  code: string | null
  options: Option[]
  topic: string | null
  difficulty: number
  points: number
  sort_order?: number
}

export type Answer =
  | { value: string }
  | { values: string[] }
  | { order: string[] }
  | { accepted: string[] }

export type Response = { value?: string; values?: string[]; order?: string[] }

export interface QuestionResult {
  question_id: string
  is_correct: boolean
  answer: Answer & { value?: string; values?: string[]; order?: string[]; accepted?: string[] }
  explanation: string
}

export interface EarnedBadge {
  code: string
  name: string
  description: string
  icon: string
  tier: 'bronze' | 'silver' | 'gold'
}

export interface AttemptResult {
  attempt_id: string
  score: number
  max_score: number
  correct: number
  total: number
  percent: number
  passed: boolean
  xp_earned: number
  daily_bonus?: boolean
  level_before: number
  level_after: number
  new_badges: EarnedBadge[]
  is_assessment: boolean
  results: QuestionResult[]
}

export interface Badge {
  id: string
  code: string
  name: string
  description: string
  icon: string
  tier: 'bronze' | 'silver' | 'gold'
  rule_type: string
  rule_value: number
  subject_id: string | null
  sort_order: number
}

export interface ClassRow {
  id: string
  name: string
  subject_id: string
  instructor_id: string
  join_code: string
  group_type: GroupType
  academic_year: string
  created_at: string
}

export interface LeaderboardRow {
  rank_no: number
  display_name: string
  level: number
  points: number
  badges: number
  is_me: boolean
  year_level: number | null
  section: string | null
}

export type ActionState = { ok?: boolean; error?: string; message?: string } | null
