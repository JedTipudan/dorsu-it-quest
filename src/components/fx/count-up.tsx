'use client'

import { useEffect, useRef, useState } from 'react'
import { fxLevel } from '@/lib/motion'

/** Animates a number from 0 (or `from`) up to `value` once it scrolls into view. */
export function CountUp({ value, from = 0, duration = 1200, className, suffix = '' }: {
  value: number
  from?: number
  duration?: number
  className?: string
  suffix?: string
}) {
  const [n, setN] = useState(from)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Reduced motion: jump straight to the final value (still via rAF, not a synchronous setState).
    const d = fxLevel() === 'off' ? 0 : duration
    let raf = 0
    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = d === 0 ? 1 : Math.min(1, (now - start) / d)
        const eased = 1 - Math.pow(1 - t, 3)
        setN(Math.round(from + (value - from) * eased))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        run()
        io.disconnect()
      }
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, from, duration])

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {n.toLocaleString('en-PH')}{suffix}
    </span>
  )
}
