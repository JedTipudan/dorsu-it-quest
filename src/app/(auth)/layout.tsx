import { Flame, Medal, Swords, Trophy } from 'lucide-react'
import { RankEmblem } from '@/components/game/rank-emblem'
import { Logo } from '@/components/logo'
import { Alert } from '@/components/ui/misc'
import { isSupabaseConfigured } from '@/lib/env'
import { CaptchaProvider } from './captcha'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative isolate hidden overflow-hidden border-r border-line p-10 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="arena-floor -z-10" />
        <div aria-hidden="true" className="absolute top-1/4 left-1/3 -z-10 size-96 rounded-full bg-indigo-600/30 blur-[100px]" />
        <Logo className="relative" />
        <div className="relative stagger">
          <div className="flex items-end gap-3" aria-hidden="true">
            <RankEmblem level={2} size="sm" className="opacity-60" />
            <RankEmblem level={6} size="md" className="opacity-80" />
            <RankEmblem level={12} size="lg" animated />
          </div>
          <h2 className="mt-8 text-5xl leading-[0.95] font-bold uppercase">
            Every quest is a<br /><span className="text-lime text-glow-lime">skill you keep.</span>
          </h2>
          <ul className="mt-8 space-y-4 text-slate-700">
            <li className="flex items-center gap-3"><Trophy className="size-5 text-gold" aria-hidden="true" /> Climb your class leaderboard</li>
            <li className="flex items-center gap-3"><Swords className="size-5 text-lime" aria-hidden="true" /> Take on timed boss challenges</li>
            <li className="flex items-center gap-3"><Medal className="size-5 text-indigo-400" aria-hidden="true" /> Collect badges for real skills</li>
            <li className="flex items-center gap-3"><Flame className="size-5 text-hot" aria-hidden="true" /> Keep a daily review streak going</li>
          </ul>
        </div>
        <p className="hud relative">Davao Oriental State University · BS Information Technology</p>
      </aside>
      <main id="main" className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-rise">
          <Logo className="mb-8 lg:hidden" />
          {!isSupabaseConfigured && (
            <Alert tone="warning" className="mb-6">
              <strong>Setup needed:</strong> Supabase environment variables are missing, so sign-in is disabled. See the README’s deployment guide.
            </Alert>
          )}
          <CaptchaProvider>
            <div className="card chamfer border-line-bright p-6 sm:p-8">{children}</div>
          </CaptchaProvider>
        </div>
      </main>
    </div>
  )
}
