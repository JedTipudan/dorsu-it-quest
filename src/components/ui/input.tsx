import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-lg border border-line bg-[#090b20] px-3.5 text-base text-slate-950 placeholder:text-slate-400 transition ' +
  'focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/15 disabled:bg-slate-50 disabled:text-slate-500 ' +
  'aria-[invalid=true]:border-red-400'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(field, 'h-11', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(field, 'min-h-28 py-2.5', className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(field, 'h-11 pr-9', className)} {...props} />
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.16em] text-slate-600 uppercase', className)} {...props} />
}

export function Field({
  label, htmlFor, hint, error, children, className,
}: { label: string; htmlFor: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-red-700" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}
