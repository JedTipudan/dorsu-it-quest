import Link from 'next/link'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icons/logo.svg" alt="" width={40} height={40} className={cn('size-10 rounded-xl shadow-[0_0_20px_-4px_rgb(130_104_255/0.8)]', className)} />
  )
}

export function Logo({ href = '/', className }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn('group flex items-center gap-2.5 rounded-xl', className)} aria-label="DOrSU IT Quest home">
      <LogoMark className="transition group-hover:rotate-[-6deg] group-hover:scale-105" />
      <span className="leading-none">
        <span className="block font-display text-lg font-bold tracking-wider text-white uppercase">IT Quest</span>
        <span className="block font-mono text-[10px] font-semibold tracking-[0.2em] text-lime uppercase">DOrSU · BSIT</span>
      </span>
    </Link>
  )
}
