'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BarChart3, BookOpen, CalendarCheck, ClipboardList, Crown, Gift, Flame, FlaskConical, GraduationCap, Inbox, LayoutDashboard, LogOut,
  Hammer, Medal, Megaphone, Menu, MessageSquare, Shield, Swords, Trophy, User, Users, X, type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { MotionToggle } from '@/components/fx/motion-toggle'
import { InstallButton } from '@/components/pwa/pwa'
import { RankEmblem } from '@/components/game/rank-emblem'
import { Progress } from '@/components/ui/misc'
import { levelProgress, rankTier, rankTitle } from '@/lib/gamification'
import type { Role } from '@/lib/types'
import { cn, formatNumber } from '@/lib/utils'
import { logout } from '@/app/(auth)/actions'

interface NavItem { href: string; label: string; icon: LucideIcon }

const STUDENT_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/checkin', label: 'Check-in', icon: CalendarCheck },
  { href: '/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/challenge', label: 'Daily Challenge', icon: Swords },
  { href: '/labs', label: 'Labs', icon: FlaskConical },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/badges', label: 'Badges', icon: Medal },
]
const ACCOUNT_NAV: NavItem[] = [
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/surveys', label: 'Surveys', icon: ClipboardList },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
]
const STAFF_NAV: NavItem[] = [
  { href: '/instructor', label: 'Command Center', icon: GraduationCap },
  { href: '/instructor/classes', label: 'Classes', icon: Users },
  { href: '/instructor/content', label: 'Quest Forge', icon: Hammer },
  { href: '/instructor/announcements', label: 'Briefings', icon: Megaphone },
  { href: '/instructor/research', label: 'Research', icon: BarChart3 },
  { href: '/instructor/feedback', label: 'Feedback inbox', icon: Inbox },
]
const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Admin HQ', icon: Shield },
  { href: '/admin/users', label: 'Users & roles', icon: Users },
]

/** Mobile bottom bar. The centre item is the raised button. */
const BOTTOM_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/subjects', label: 'Quests', icon: BookOpen },
  { href: '/challenge', label: 'Challenge', icon: Swords },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
]
const STAFF_BOTTOM_NAV: NavItem[] = [
  { href: '/instructor', label: 'Command', icon: GraduationCap },
  { href: '/instructor/classes', label: 'Classes', icon: Users },
  { href: '/instructor/content', label: 'Forge', icon: Hammer },
  { href: '/instructor/research', label: 'Research', icon: BarChart3 },
]
const CENTER_HREFS = ['/challenge', '/instructor/content']

export interface ShellUser {
  displayName: string
  fullName: string
  role: Role
  xp: number
  streak: number
  /** equipped exclusive title name / frame ring background */
  title?: string | null
  frame?: string | null
  /** today's Supply Drop hasn't been claimed yet */
  checkinReady?: boolean
}

function isActive(pathname: string, href: string) {
  if (href === '/dashboard' || href === '/instructor' || href === '/admin') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

function NavSection({ title, items, pathname, onNavigate, alertHref }: { title?: string; items: NavItem[]; pathname: string; onNavigate?: () => void; alertHref?: string | null }) {
  return (
    <div>
      {title && <p className="hud mb-1.5 px-3">{title}</p>}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 font-display text-[15px] font-semibold tracking-wide uppercase transition duration-150',
                  active
                    ? 'bg-gradient-to-r from-lime/15 to-transparent text-lime before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r before:bg-lime before:shadow-[0_0_12px_#c4ff3d]'
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-white',
                )}
              >
                <item.icon className="size-[18px] shrink-0 transition group-hover:scale-110" aria-hidden="true" />
                {item.label}
                {alertHref === item.href && (
                  <span className="ml-auto flex items-center gap-1 rounded bg-lime px-1.5 py-px font-mono text-[9px] text-lime-ink">
                    <span className="size-1.5 rounded-full bg-lime-ink animate-blink" aria-hidden="true" />READY
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function UserCard({ user }: { user: ShellUser }) {
  const lp = levelProgress(user.xp)
  const tier = rankTier(lp.level)
  return (
    <Link href="/profile" className="group card chamfer block overflow-hidden border-line-bright p-3.5 transition hover:shadow-glow">
      <div aria-hidden="true" className="absolute -top-10 -right-10 size-28 rounded-full opacity-40 blur-2xl" style={{ background: tier.glow }} />
      <div className="relative flex items-center gap-3">
        <RankEmblem level={lp.level} size="md" frame={user.frame} className="transition group-hover:scale-105" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-display font-bold text-white uppercase">
            {user.displayName}
            {user.role !== 'student' && (
              <span className={cn('flex shrink-0 items-center gap-0.5 rounded px-1.5 py-px font-mono text-[9px] tracking-widest', user.role === 'admin' ? 'bg-gold text-[#2a1a00]' : 'bg-cyan text-arena')}>
                {user.role === 'admin' ? <Crown className="size-2.5" aria-hidden="true" /> : <Shield className="size-2.5" aria-hidden="true" />}{user.role}
              </span>
            )}
          </p>
          <p className="truncate text-xs font-semibold" style={{ color: tier.from }}>{user.title ? <span className="text-gold">« {user.title} »</span> : <>{tier.name} · {rankTitle(lp.level)}</>}</p>
        </div>
        {user.streak > 0 && (
          <span className="flex items-center gap-0.5 rounded-md bg-hot/15 px-2 py-1 font-display text-sm font-bold text-hot" title={`${user.streak}-day streak`}>
            <Flame className="size-4" aria-hidden="true" />{user.streak}
          </span>
        )}
      </div>
      <Progress value={lp.percent} className="relative mt-3 h-2" shine barClassName="from-indigo-500 to-lime" label="Level progress" />
      <p className="relative mt-1.5 flex justify-between font-mono text-[10px] text-slate-500">
        <span>{formatNumber(user.xp)} XP</span><span>{formatNumber(lp.toNext)} to LV {lp.level + 1}</span>
      </p>
    </Link>
  )
}

function NavContent({ user, pathname, onNavigate }: { user: ShellUser; pathname: string; onNavigate?: () => void }) {
  const staff = user.role === 'instructor' || user.role === 'admin'
  return (
    <div className="flex flex-col gap-5">
      <UserCard user={user} />
      {/* Staff see their tools first; the student side stays available as "Player mode" for playtesting. */}
      {user.role === 'admin' && <NavSection title="Admin" items={ADMIN_NAV} pathname={pathname} onNavigate={onNavigate} />}
      {staff && <NavSection title="Command" items={STAFF_NAV} pathname={pathname} onNavigate={onNavigate} />}
      <NavSection title={staff ? 'Player mode' : undefined} items={STUDENT_NAV} pathname={pathname} onNavigate={onNavigate} alertHref={user.checkinReady ? '/checkin' : null} />
      <NavSection title="Account" items={ACCOUNT_NAV} pathname={pathname} onNavigate={onNavigate} />
      <div className="space-y-1 border-t border-line pt-4">
        <InstallButton compact className="w-full" />
        <MotionToggle />
        <form action={logout}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-display text-[15px] font-semibold tracking-wide text-slate-600 uppercase transition hover:bg-red-50 hover:text-red-700">
            <LogOut className="size-[18px]" aria-hidden="true" /> Log out
          </button>
        </form>
      </div>
    </div>
  )
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const lp = levelProgress(user.xp)

  return (
    <div className="min-h-dvh lg:pl-72">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-line bg-panel/90 backdrop-blur-md lg:flex">
        <div className="flex h-16 shrink-0 items-center px-5"><Logo href="/dashboard" /></div>
        <nav className="flex-1 overflow-y-auto px-4 pb-6" aria-label="Main">
          <NavContent user={user} pathname={pathname} />
        </nav>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-arena/85 px-4 backdrop-blur-md lg:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          {user.checkinReady && (
            <Link href="/checkin" aria-label="Daily check-in ready" className="relative grid size-9 place-items-center rounded-lg bg-lime text-lime-ink shadow-glow-lime">
              <Gift className="size-5" aria-hidden="true" />
              <span className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-arena bg-hot animate-pulse" aria-hidden="true" />
            </Link>
          )}
          <Link href="/profile" className="flex items-center gap-1.5 rounded-lg bg-panel-2 py-1 pr-2.5 pl-1 font-display text-sm font-bold text-white ring-1 ring-line" aria-label={`Level ${lp.level}, ${user.xp} XP`}>
            <RankEmblem level={lp.level} size="xs" />
            {formatNumber(user.xp)} <span className="text-lime">XP</span>
          </Link>
          {user.streak > 0 && (
            <span className="flex items-center gap-0.5 rounded-lg bg-hot/15 px-2 py-1.5 font-display text-sm font-bold text-hot" aria-label={`${user.streak}-day streak`}>
              <Flame className="size-4" aria-hidden="true" />{user.streak}
            </span>
          )}
          <button type="button" onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-lg text-white hover:bg-indigo-100" aria-label="Open menu" aria-expanded={open}>
            <Menu className="size-6" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 right-0 flex w-[85%] max-w-xs flex-col overflow-y-auto border-l border-line bg-panel p-4 pb-safe shadow-clay-lg animate-rise" aria-label="Mobile">
            <div className="mb-4 flex items-center justify-between">
              <span className="hud hud-tick">Menu</span>
              <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-lg hover:bg-indigo-100" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <NavContent user={user} pathname={pathname} onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>

      {/* Mobile bottom nav: the centre slot is a raised "PLAY" button for the Daily Challenge. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-arena/90 pb-safe backdrop-blur-md lg:hidden" aria-label="Quick">
        <ul className="mx-auto grid max-w-md grid-cols-5 items-end">
          {(user.role === 'student' ? BOTTOM_NAV : STAFF_BOTTOM_NAV).map((item) => {
            const active = isActive(pathname, item.href)
            if (CENTER_HREFS.includes(item.href)) {
              return (
                <li key={item.href} className="flex justify-center">
                  <Link href={item.href} aria-current={active ? 'page' : undefined} aria-label={item.label}
                    className="chamfer -mt-5 mb-2 grid size-14 place-items-center bg-lime text-lime-ink shadow-glow-lime transition active:scale-95">
                    <item.icon className="size-6" aria-hidden="true" />
                  </Link>
                </li>
              )
            }
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex h-16 flex-col items-center justify-center gap-0.5 font-display text-[11px] font-semibold tracking-wider uppercase', active ? 'text-lime' : 'text-slate-500')}>
                  <span className={cn('grid h-7 w-12 place-items-center rounded-md transition', active && 'bg-lime/15')}>
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  {item.label}
                </Link>
              </li>
            )
          })}
          <li>
            <button type="button" onClick={() => setOpen(true)} className="flex h-16 w-full flex-col items-center justify-center gap-0.5 font-display text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              <span className="grid h-7 w-12 place-items-center rounded-md"><Menu className="size-5" aria-hidden="true" /></span>
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
