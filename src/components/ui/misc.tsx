import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CountUp } from '@/components/fx/count-up'
import { cn } from '@/lib/utils'

const pillTones = {
  indigo: 'bg-indigo-100 text-indigo-800 ring-indigo-300/40',
  orange: 'bg-orange-100 text-orange-800 ring-orange-500/30',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-500/30',
  red: 'bg-red-100 text-red-800 ring-red-500/30',
  slate: 'bg-slate-100 text-slate-700 ring-slate-300/50',
  sky: 'bg-sky-100 text-sky-800 ring-sky-500/30',
  violet: 'bg-violet-100 text-violet-800 ring-violet-500/30',
  amber: 'bg-amber-100 text-amber-900 ring-amber-500/30',
} as const
export type PillTone = keyof typeof pillTones

export function Pill({ tone = 'indigo', className, ...props }: ComponentProps<'span'> & { tone?: PillTone }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide uppercase ring-1 ring-inset', pillTones[tone], className)}
      {...props}
    />
  )
}

export function Progress({
  value, className, barClassName, label, color, shine = false,
}: { value: number; className?: string; barClassName?: string; label?: string; color?: string; shine?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      className={cn('h-2.5 w-full overflow-hidden rounded-sm bg-slate-100 ring-1 ring-inset ring-white/5', className)}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-sm bg-gradient-to-r from-indigo-500 to-[#2de2e6] transition-[width] duration-1000 ease-out', shine && 'shine', barClassName)}
        style={{ width: `${v}%`, ...(color ? { background: color, boxShadow: `0 0 12px ${color}88` } : {}) }}
      />
    </div>
  )
}

export function PageHeader({
  title, description, actions, icon: Icon,
}: { title: string; description?: ReactNode; actions?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="mb-7 flex flex-col gap-4 animate-rise sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        {Icon && (
          <span className="chamfer mt-1 hidden size-12 shrink-0 place-items-center bg-indigo-600 text-white shadow-press sm:grid">
            <Icon className="size-6" aria-hidden="true" />
          </span>
        )}
        <div>
          <p className="hud hud-tick">DOrSU IT Quest</p>
          <h1 className="mt-1 text-3xl font-bold tracking-wide uppercase sm:text-4xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-slate-600">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const statTones = {
  indigo: { chip: 'bg-indigo-100 text-indigo-700', bar: '#8268ff' },
  orange: { chip: 'bg-orange-100 text-orange-700', bar: '#ff8a3d' },
  emerald: { chip: 'bg-emerald-100 text-emerald-700', bar: '#1fcf8f' },
  violet: { chip: 'bg-violet-100 text-violet-700', bar: '#a78bfa' },
  sky: { chip: 'bg-sky-100 text-sky-700', bar: '#38bdf8' },
}

export function StatCard({
  label, value, icon: Icon, hint, tone = 'indigo',
}: { label: string; value: ReactNode; icon: LucideIcon; hint?: ReactNode; tone?: keyof typeof statTones }) {
  const t = statTones[tone]
  return (
    <div className="card card-hover flex items-center gap-3 overflow-hidden p-4">
      <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r" style={{ background: t.bar, boxShadow: `0 0 12px ${t.bar}` }} />
      <span className={cn('chamfer-sm grid size-11 shrink-0 place-items-center', t.chip)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="hud truncate">{label}</p>
        <p className="font-display text-2xl leading-tight font-bold text-slate-950">
          {typeof value === 'number' ? <CountUp value={value} /> : value}
        </p>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon, title, description, action,
}: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="chamfer mb-4 grid size-16 place-items-center bg-indigo-100 text-indigo-700 animate-float">
        <Icon className="size-8" aria-hidden="true" />
      </span>
      <h3 className="text-xl font-bold tracking-wide uppercase">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

const alertTones = {
  info: 'border-indigo-300/50 bg-indigo-50 text-indigo-900',
  error: 'border-red-500/40 bg-red-50 text-red-800',
  success: 'border-emerald-500/40 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-500/40 bg-amber-50 text-amber-900',
}

export function Alert({
  tone = 'info', children, className,
}: { tone?: keyof typeof alertTones; children: ReactNode; className?: string }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-lg border border-l-4 px-4 py-3 text-sm animate-rise', alertTones[tone], className)}>
      {children}
    </div>
  )
}
