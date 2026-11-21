import { useId } from 'react'
import { rankTier } from '@/lib/gamification'
import { cn } from '@/lib/utils'

/** Hexagonal rank emblem with the level number, colored by competitive tier. */
export function RankEmblem({ level, size = 'md', className, animated = false, frame }: {
  level: number
  /** CSS background for an exclusive cosmetic frame (see lib/cosmetics.ts) */
  frame?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  animated?: boolean
}) {
  const id = useId()
  const tier = rankTier(level)
  const px = { xs: 'size-7 text-xs', sm: 'size-10 text-sm', md: 'size-14 text-lg', lg: 'size-20 text-2xl', xl: 'size-28 text-4xl' }[size]
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', px, className)} title={`${tier.name} · Level ${level}`}>
      {frame && <span aria-hidden="true" className="frame-ring" style={{ background: frame }} />}
      {animated && (
        <span aria-hidden="true" className="absolute -inset-2 rounded-full opacity-70 blur-xl animate-glow" style={{ background: tier.glow }} />
      )}
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tier.from} />
            <stop offset="1" stopColor={tier.to} />
          </linearGradient>
        </defs>
        <polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill={`url(#g${id})`} />
        <polygon points="50,14 83,33 83,67 50,86 17,67 17,33" fill="#0b0d24" />
        <polygon points="50,14 83,33 83,67 50,86 17,67 17,33" fill="none" stroke={tier.from} strokeOpacity="0.5" strokeWidth="2" />
      </svg>
      <span className="relative font-display leading-none font-bold text-white" style={{ textShadow: `0 0 12px ${tier.glow}` }}>
        {level}
      </span>
      <span className="sr-only">{tier.name} tier, level {level}</span>
    </span>
  )
}
