'use client'

import { useRef } from 'react'
import { fxLevel } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** 3D tilt that follows the mouse (desktop only, full effects only), with a moving glare. */
export function Tilt({ children, className, max = 10 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const glare = useRef<HTMLDivElement>(null)

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || fxLevel() !== 'full' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) scale(1.02)`
    if (glare.current) {
      glare.current.style.opacity = '1'
      glare.current.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgb(255 255 255 / 0.14), transparent 55%)`
    }
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = ''
    if (glare.current) glare.current.style.opacity = '0'
  }

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset}
      className={cn('relative transition-transform duration-200 ease-out [transform-style:preserve-3d] will-change-transform', className)}>
      {children}
      <div ref={glare} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300" />
    </div>
  )
}
