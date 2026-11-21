// Mirrors public.level_for_xp() in the database: level = floor(sqrt(xp / 100)) + 1
export function levelForXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1
}

/** Total XP required to reach a level. */
export function xpForLevel(level: number) {
  return 100 * (level - 1) ** 2
}

export function levelProgress(xp: number) {
  const level = levelForXp(xp)
  const start = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return {
    level,
    current: xp - start,
    needed: next - start,
    toNext: next - xp,
    percent: Math.round(((xp - start) / (next - start)) * 100),
  }
}

const TITLES = [
  'Newbie', 'Script Kiddie', 'Code Cadet', 'Bit Wrangler', 'Packet Pusher',
  'Query Crafter', 'Stack Sage', 'Systems Knight', 'Cyber Champion', 'IT Legend',
]
export function rankTitle(level: number) {
  return TITLES[Math.min(level, TITLES.length) - 1]
}

/** Competitive tier (visual only) — colors the rank emblem, player card and leaderboard rows. */
export const TIERS = [
  { name: 'Iron', min: 1, from: '#8a8fa8', to: '#4b4f66', glow: 'rgb(138 143 168 / 0.45)' },
  { name: 'Bronze', min: 2, from: '#f0a45d', to: '#8a4a1c', glow: 'rgb(240 164 93 / 0.5)' },
  { name: 'Silver', min: 4, from: '#e6ebf5', to: '#8892aa', glow: 'rgb(220 228 245 / 0.5)' },
  { name: 'Gold', min: 6, from: '#ffe066', to: '#d98a00', glow: 'rgb(255 197 61 / 0.6)' },
  { name: 'Platinum', min: 8, from: '#7ff5e3', to: '#1f8f9e', glow: 'rgb(45 226 230 / 0.55)' },
  { name: 'Diamond', min: 10, from: '#b4a6ff', to: '#4c2fd6', glow: 'rgb(130 104 255 / 0.65)' },
  { name: 'Legend', min: 12, from: '#ff7ab0', to: '#c4ff3d', glow: 'rgb(255 61 127 / 0.6)' },
] as const
export type TierInfo = (typeof TIERS)[number]

export function rankTier(level: number): TierInfo {
  let t: TierInfo = TIERS[0]
  for (const tier of TIERS) if (level >= tier.min) t = tier
  return t
}

/** A streak only counts if you were active today or yesterday (Asia/Manila). */
export function activeStreak(streak: number, lastActive: string | null) {
  if (!lastActive) return 0
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  today.setHours(0, 0, 0, 0)
  const last = new Date(lastActive + 'T00:00:00')
  const diff = Math.round((today.getTime() - last.getTime()) / 86_400_000)
  return diff <= 1 ? streak : 0
}

export const QUEST_TYPE_LABEL: Record<string, string> = {
  quiz: 'Quiz',
  simulation: 'Simulation',
  challenge: 'Boss Challenge',
  pretest: 'Pretest',
  posttest: 'Posttest',
}

export const DIFFICULTY_LABEL = ['', 'Easy', 'Medium', 'Hard']

export const PASSING_PERCENT = 60
