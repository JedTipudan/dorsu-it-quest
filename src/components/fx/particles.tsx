'use client'

import { useEffect, useRef } from 'react'
import { fxLevel } from '@/lib/motion'

/**
 * Lightweight drifting "data particle" field for hero sections.
 * Canvas-based, ~1 draw call per particle, pauses when off-screen or the tab is hidden,
 * and is not rendered at all when effects are reduced/off.
 */
const DEFAULT_COLORS = ['#c4ff3d', '#8268ff', '#2de2e6', '#ffffff']

export function Particles({ className, density = 0.00009, colors = DEFAULT_COLORS }: {
  className?: string
  density?: number
  colors?: string[]
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || fxLevel() !== 'full') return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0, h = 0, raf = 0, visible = true
    type P = { x: number; y: number; vx: number; vy: number; r: number; c: string; a: number }
    let ps: P[] = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(90, Math.round(w * h * density))
      ps = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15, vy: -0.1 - Math.random() * 0.35,
        r: Math.random() * 1.6 + 0.4, c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * 0.6 + 0.2,
      }))
    }

    const frame = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of ps) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w }
        if (p.x < -4) p.x = w + 4
        if (p.x > w + 4) p.x = -4
        ctx.globalAlpha = p.a
        ctx.fillStyle = p.c
        ctx.fillRect(p.x, p.y, p.r * 2, p.r * 2) // squares read as "pixels" — on theme and cheaper than arcs
      }
      ctx.globalAlpha = 1
      if (visible) raf = requestAnimationFrame(frame)
    }

    const io = new IntersectionObserver(([e]) => {
      const was = visible
      visible = e.isIntersecting && !document.hidden
      if (visible && !was) raf = requestAnimationFrame(frame)
    })
    const onVis = () => {
      const was = visible
      visible = !document.hidden
      if (visible && !was) raf = requestAnimationFrame(frame)
    }

    resize()
    raf = requestAnimationFrame(frame)
    io.observe(canvas)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [density, colors])

  return <canvas ref={ref} aria-hidden="true" className={`particles pointer-events-none absolute inset-0 size-full ${className ?? ''}`} />
}
