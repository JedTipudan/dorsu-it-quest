/**
 * Visual-effects level, stored on <html data-fx="…"> before first paint (see MOTION_BOOT_SCRIPT).
 *
 *   full    → every animation
 *   reduced → fades / count-ups only; no large or continuous motion (OS "reduce motion" default)
 *   off     → no animation at all
 *
 * The user's choice ("auto" | "on" | "off") is kept in localStorage; "auto" follows the OS.
 */
export type FxLevel = 'full' | 'reduced' | 'off'
export type MotionPref = 'auto' | 'on' | 'off'

export const MOTION_KEY = 'itq-motion'

/** Inline <head> script: sets data-fx before the page paints (no flash, no hydration flicker). */
export const MOTION_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem('${MOTION_KEY}')||'auto';var r=window.matchMedia('(prefers-reduced-motion: reduce)').matches;document.documentElement.dataset.fx=p==='on'?'full':p==='off'?'off':(r?'reduced':'full');document.documentElement.dataset.motion=p}catch(e){document.documentElement.dataset.fx='full'}})()`

export function fxLevel(): FxLevel {
  if (typeof document === 'undefined') return 'full'
  const v = document.documentElement.dataset.fx
  return v === 'off' || v === 'reduced' ? v : 'full'
}

export function applyMotionPref(pref: MotionPref) {
  try {
    localStorage.setItem(MOTION_KEY, pref)
  } catch {}
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const root = document.documentElement
  root.dataset.motion = pref
  root.dataset.fx = pref === 'on' ? 'full' : pref === 'off' ? 'off' : reduce ? 'reduced' : 'full'
  window.dispatchEvent(new Event('itq-fx-change'))
}
