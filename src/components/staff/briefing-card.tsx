import { AlertOctagon, CalendarClock, Info } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'

export interface Briefing {
  id: string
  author_id: string
  class_id: string | null
  title: string
  body: string
  tone: 'info' | 'event' | 'urgent'
  pinned: boolean
  expires_at: string | null
  created_at: string
  classes?: { name: string } | null
  profiles?: { display_name: string; full_name: string } | null
}

const TONE = {
  info: { icon: Info, color: '#8268ff', label: 'Briefing' },
  event: { icon: CalendarClock, color: '#2de2e6', label: 'Event' },
  urgent: { icon: AlertOctagon, color: '#ff3d7f', label: 'Urgent' },
} as const

/** A "mission briefing" card. Used on the student dashboard and the staff Briefings page. */
export function BriefingCard({ b, meta, action, compact = false }: { b: Briefing; meta?: React.ReactNode; action?: React.ReactNode; compact?: boolean }) {
  const t = TONE[b.tone] ?? TONE.info
  const author = b.profiles?.display_name || b.profiles?.full_name
  return (
    <article className={cn('card relative overflow-hidden', compact ? 'p-4' : 'p-5')} style={{ borderColor: `${t.color}55` }}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: t.color, boxShadow: `0 0 14px ${t.color}` }} />
      <div className="flex items-start gap-3">
        <span className="chamfer-sm grid size-10 shrink-0 place-items-center" style={{ background: `${t.color}22`, color: t.color }}>
          <t.icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="hud flex flex-wrap items-center gap-x-2" style={{ color: t.color }}>
            {t.label}<span className="text-slate-500">· {formatDateTime(b.created_at)}{author ? ` · ${author}` : ''}</span>
          </p>
          <h3 className="mt-0.5 font-display text-lg font-bold text-white uppercase">{b.title}</h3>
          {b.body && <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{b.body}</p>}
          {meta && <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">{meta}</p>}
        </div>
        {action}
      </div>
    </article>
  )
}
