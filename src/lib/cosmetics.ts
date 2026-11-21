// Exclusive cosmetics. The database (table public.cosmetics) decides who owns what;
// this file holds the names and VISUALS. `npm run db:test` checks both lists match.

export type CosmeticKind = 'title' | 'frame'
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Cosmetic {
  kind: CosmeticKind
  name: string
  rarity: Rarity
  /** frames only: CSS background for the animated ring around the rank emblem */
  ring?: string
}

export const COSMETICS: Record<string, Cosmetic> = {
  title_regular: { kind: 'title', name: 'The Regular', rarity: 'common' },
  title_week: { kind: 'title', name: 'Week Warrior', rarity: 'rare' },
  title_fortnight: { kind: 'title', name: 'Fortnight Grinder', rarity: 'rare' },
  title_perfect: { kind: 'title', name: 'Perfect Attendance', rarity: 'epic' },
  title_legend: { kind: 'title', name: 'Campus Legend', rarity: 'legendary' },
  title_byte: { kind: 'title', name: 'Byte-Sized Genius', rarity: 'epic' },
  title_packet: { kind: 'title', name: 'Packet Whisperer', rarity: 'rare' },
  title_query: { kind: 'title', name: 'Query Royalty', rarity: 'rare' },
  title_nullhunt: { kind: 'title', name: 'Null Pointer Hunter', rarity: 'rare' },
  title_stack: { kind: 'title', name: 'Stack Overflow Survivor', rarity: 'epic' },
  title_404: { kind: 'title', name: '404: Sleep Not Found', rarity: 'epic' },
  title_root: { kind: 'title', name: 'Root Access', rarity: 'legendary' },
  frame_neon: { kind: 'frame', name: 'Neon Circuit', rarity: 'rare', ring: 'conic-gradient(from 0deg, #2de2e6, #8268ff, #2de2e6)' },
  frame_gold: { kind: 'frame', name: 'Gold Standard', rarity: 'epic', ring: 'conic-gradient(from 0deg, #ffe066, #d98a00, #fff3b0, #d98a00, #ffe066)' },
  frame_aurora: { kind: 'frame', name: 'Aurora', rarity: 'legendary', ring: 'conic-gradient(from 0deg, #ff3d7f, #ffc53d, #c4ff3d, #2de2e6, #8268ff, #ff3d7f)' },
  frame_scholar: { kind: 'frame', name: "Scholar's Halo", rarity: 'legendary', ring: 'conic-gradient(from 0deg, #ffffff, #b4a6ff, #ffffff, #ffc53d, #ffffff)' },
  frame_lime: { kind: 'frame', name: 'Toxic Lime', rarity: 'rare', ring: 'conic-gradient(from 0deg, #c4ff3d, #0d1600, #c4ff3d)' },
  frame_signal: { kind: 'frame', name: 'Hot Signal', rarity: 'rare', ring: 'conic-gradient(from 0deg, #ff3d7f, #2a0010, #ff3d7f)' },
  frame_matrix: { kind: 'frame', name: 'Matrix Rain', rarity: 'epic', ring: 'repeating-conic-gradient(from 0deg, #00ff88 0 12deg, #002a14 12deg 24deg)' },
}

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Common', color: '#aab0d8' },
  rare: { label: 'Rare', color: '#2de2e6' },
  epic: { label: 'Epic', color: '#b4a6ff' },
  legendary: { label: 'Legendary', color: '#ffc53d' },
}

export const titleName = (code?: string | null) => (code && COSMETICS[code]?.kind === 'title' ? COSMETICS[code].name : null)
export const frameRing = (code?: string | null) => (code && COSMETICS[code]?.kind === 'frame' ? COSMETICS[code].ring ?? null : null)
