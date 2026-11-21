'use client'

import { Sparkles, ZapOff, Wand2 } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { applyMotionPref, type MotionPref } from '@/lib/motion'
import { cn } from '@/lib/utils'

const NEXT: Record<MotionPref, MotionPref> = { auto: 'on', on: 'off', off: 'auto' }
const LABEL: Record<MotionPref, string> = { auto: 'Effects: Auto', on: 'Effects: Full', off: 'Effects: Off' }
const ICON = { auto: Wand2, on: Sparkles, off: ZapOff }

const subscribe = (cb: () => void) => {
  window.addEventListener('itq-fx-change', cb)
  return () => window.removeEventListener('itq-fx-change', cb)
}
const read = (): MotionPref => {
  const v = document.documentElement.dataset.motion
  return v === 'on' || v === 'off' ? v : 'auto'
}

/** Cycles Auto → Full → Off. "Auto" follows the device's reduce-motion setting. */
export function MotionToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  const pref = useSyncExternalStore(subscribe, read, () => 'auto' as MotionPref)
  const Icon = ICON[pref]
  return (
    <button
      type="button"
      onClick={() => applyMotionPref(NEXT[pref])}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg font-display font-semibold tracking-wide uppercase transition hover:bg-indigo-100 hover:text-white',
        compact ? 'size-9 justify-center text-slate-600' : 'w-full px-3 py-2.5 text-[15px] text-slate-600',
        pref === 'on' && 'text-lime',
        className,
      )}
      aria-label={`${LABEL[pref]}. Click to change.`}
      title={`${LABEL[pref]} (click to change)`}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      {!compact && LABEL[pref]}
    </button>
  )
}
