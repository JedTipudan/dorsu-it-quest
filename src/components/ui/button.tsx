import Link from 'next/link'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  primary: 'chamfer bg-indigo-600 text-white shadow-press hover:bg-indigo-500 hover:brightness-110',
  /** The big "PLAY" button — electric lime. */
  accent: 'chamfer bg-lime text-lime-ink shadow-press font-bold uppercase tracking-wider hover:brightness-110',
  secondary: 'chamfer bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  outline: 'chamfer bg-panel-2 text-slate-800 ring-1 ring-inset ring-line-bright hover:bg-indigo-100 hover:text-white',
  ghost: 'rounded-lg text-slate-700 hover:bg-indigo-100 hover:text-white',
  danger: 'chamfer bg-[#e11d48] text-white shadow-press hover:brightness-110',
  success: 'chamfer bg-[#059669] text-white shadow-press hover:brightness-110',
} as const

const sizes = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
  icon: 'h-11 w-11',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center font-display font-semibold transition duration-150 ease-out',
    'active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
}

export function Button({
  variant, size, className, type = 'button', ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

export function LinkButton({
  variant, size, className, ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}
