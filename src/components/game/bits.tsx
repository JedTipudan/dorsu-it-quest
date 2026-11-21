import { Lock } from 'lucide-react'
import { DynamicIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

export function SubjectIcon({ icon, color, className, size = 'md' }: { icon: string; color: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'size-9 [&>svg]:size-4.5', md: 'size-12 [&>svg]:size-6', lg: 'size-16 [&>svg]:size-8' }
  return (
    <span
      className={cn('chamfer-sm grid shrink-0 place-items-center text-white shadow-press', sizes[size], className)}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, boxShadow: `0 0 20px -4px ${color}` }}
    >
      <DynamicIcon name={icon} />
    </span>
  )
}

const TIER = {
  bronze: { from: '#f0a45d', to: '#8a4a1c', text: '#ffcf9e', label: 'Bronze' },
  silver: { from: '#e6ebf5', to: '#7a849c', text: '#eef2fa', label: 'Silver' },
  gold: { from: '#ffe066', to: '#d98a00', text: '#ffe58a', label: 'Gold' },
} as const

export type Tier = keyof typeof TIER
export const tierLabel = (t: Tier) => TIER[t]?.label ?? t

export function BadgeMedal({ icon, tier, earned = true, size = 'md' }: { icon: string; tier: Tier; earned?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const t = TIER[tier] ?? TIER.bronze
  const s = { sm: 'size-11 [&_svg]:size-5', md: 'size-16 [&_svg]:size-7', lg: 'size-24 [&_svg]:size-11' }[size]
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center rounded-full p-[3px] transition', s, earned ? 'hover:scale-110' : 'opacity-60 grayscale')}
      style={{
        background: earned ? `conic-gradient(from 210deg, ${t.from}, ${t.to}, ${t.from})` : 'linear-gradient(135deg,#2a2f5a,#161939)',
        boxShadow: earned ? `0 0 22px -6px ${t.from}` : undefined,
      }}
    >
      <span className="grid size-full place-items-center rounded-full bg-[#0b0d24]" style={{ color: earned ? t.text : '#5b628f' }}>
        {earned ? <DynamicIcon name={icon} /> : <Lock />}
      </span>
    </span>
  )
}
