'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { fxLevel } from '@/lib/motion'

const SELECTOR = '.reveal, main .card'

/**
 * Scroll-reveal for the whole app: elements matching SELECTOR fade/rise in as they enter
 * the viewport. Content is never hidden without JS: the hidden state only applies once
 * <html> has `reveal-ready`, and anything already on screen is revealed first (no flash).
 */
export function ScrollReveal() {
  const pathname = usePathname()
  // Re-run when the user flips the Effects switch.
  const fx = useSyncExternalStore(
    (cb) => { window.addEventListener('itq-fx-change', cb); return () => window.removeEventListener('itq-fx-change', cb) },
    fxLevel,
    () => 'full',
  )

  useEffect(() => {
    const root = document.documentElement
    if (fx === 'off') {
      root.classList.remove('reveal-ready')
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    const track = (el: Element) => {
      if (el.classList.contains('in')) return
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in') // already visible
      else io.observe(el)
    }

    document.querySelectorAll(SELECTOR).forEach(track)
    root.classList.add('reveal-ready')

    // Client-side navigations and streamed content add new elements later.
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return
          if (n.matches(SELECTOR)) track(n)
          n.querySelectorAll?.(SELECTOR).forEach(track)
        })
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [pathname, fx])

  return <div aria-hidden="true" className="scroll-progress" />
}
