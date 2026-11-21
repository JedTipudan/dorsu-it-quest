import {
  BarChart3, CheckCircle2, ChevronRight, Code2, Crown, Database, EyeOff, FlaskConical, Flame, Gauge, Globe, GraduationCap,
  Medal, Network, ShieldCheck, Swords, Timer, Trophy, UserPlus, Zap,
} from 'lucide-react'
import { CountUp } from '@/components/fx/count-up'
import { MotionToggle } from '@/components/fx/motion-toggle'
import { Particles } from '@/components/fx/particles'
import { Tilt } from '@/components/fx/tilt'
import { RankEmblem } from '@/components/game/rank-emblem'
import { Logo } from '@/components/logo'
import { InstallButton } from '@/components/pwa/pwa'
import { LinkButton } from '@/components/ui/button'
import { Progress } from '@/components/ui/misc'
import { getSession } from '@/lib/auth'
import { TIERS } from '@/lib/gamification'

const SUBJECTS = [
  { name: 'Networking', role: 'The Router', icon: Network, color: '#22d3ee', topics: ['OSI & TCP/IP', 'Subnetting', 'Protocols'] },
  { name: 'Programming', role: 'The Coder', icon: Code2, color: '#a78bfa', topics: ['Control flow', 'Functions', 'OOP'] },
  { name: 'Database', role: 'The Architect', icon: Database, color: '#34d399', topics: ['ER modeling', 'SQL', 'Normalization'] },
  { name: 'Web Dev', role: 'The Builder', icon: Globe, color: '#fb923c', topics: ['HTML', 'CSS', 'JavaScript'] },
]

const MODES = [
  { icon: Swords, tag: 'Story', title: 'Quest lines', text: 'Quizzes and simulations that unlock one by one, ending in a timed boss fight.' },
  { icon: Timer, tag: 'Daily', title: 'Daily Challenge', text: '10 questions tuned to your skill level. Come back every day for +30 bonus XP.' },
  { icon: Trophy, tag: 'Ranked', title: 'Leaderboards', text: 'Battle your section, your year, or the whole campus. Weekly and 30-day boards give everyone a fresh shot.' },
  { icon: FlaskConical, tag: 'Lab', title: 'Hands-on labs', text: 'Endless subnetting drills and a live HTML/CSS/JS playground.' },
  { icon: Medal, tag: 'Collect', title: '17 badges', text: 'Bronze, silver and gold badges for real skills, not just for showing up.' },
  { icon: Gauge, tag: 'Flow', title: 'Instant feedback', text: 'See every right answer and why, the moment you finish.' },
]

const BREAK = '|'
const HEADLINE = ['Study', 'like', BREAK, 'it’s', 'ranked.']

const TICKER = ['Subnetting', 'SQL joins', 'OSI model', 'TCP handshake', 'Normalization', 'Big-O', 'CSS flexbox', 'Loops', 'HTTP status codes', 'ER diagrams', 'DNS', 'Recursion']

export default async function LandingPage() {
  const { user } = await getSession()
  const playHref = user ? '/dashboard' : '/register'

  return (
    <div className="overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-arena/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
          <Logo />
          <div className="flex items-center gap-2">
            <MotionToggle compact />
            {user ? (
              <LinkButton href="/dashboard" variant="accent" size="sm">Enter arena</LinkButton>
            ) : (
              <>
                <LinkButton href="/login" variant="ghost" size="sm">Log in</LinkButton>
                <LinkButton href="/register" variant="accent" size="sm">Play free</LinkButton>
              </>
            )}
          </div>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="arena-floor -z-10" />
          <div aria-hidden="true" className="absolute top-1/3 left-1/2 -z-10 size-[42rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />
          <Particles className="-z-10" />
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-24 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:pb-32">
            <div className="stagger">
              <p className="hud flex items-center gap-2 text-lime">
                <span className="size-2 rounded-full bg-lime animate-blink" aria-hidden="true" /> Season 1 · BSIT Arena is live
              </p>
              <h1 className="mt-5 text-5xl leading-[0.95] font-bold uppercase sm:text-6xl lg:text-7xl" aria-label="Study like it's ranked.">
                {HEADLINE.map((w, i) =>
                  w === BREAK ? <br key={i} /> : (
                    <span key={i} aria-hidden="true" className={`inline-block animate-slam ${w === 'ranked.' ? 'text-lime text-glow-lime' : ''}`} style={{ animationDelay: `${150 + i * 120}ms` }}>
                      {w}{i < HEADLINE.length - 1 && HEADLINE[i + 1] !== BREAK ? '\u00a0' : ''}
                    </span>
                  ))}
              </h1>
              <p className="mt-6 max-w-xl text-lg text-slate-600">
                Networking, Programming, Databases and Web Dev, turned into quests, boss fights and a campus-wide leaderboard.
                Earn XP, rank up from <b className="text-slate-900">Iron</b> to <b className="text-hot">Legend</b>, and actually remember it on exam day.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <LinkButton href={playHref} variant="accent" size="lg" className="shine">
                  {user ? 'Continue your run' : 'Play free now'} <ChevronRight className="size-5" aria-hidden="true" />
                </LinkButton>
                {!user && <LinkButton href="/login" variant="outline" size="lg">I have an account</LinkButton>}
                <InstallButton />
              </div>
              <dl className="mt-10 grid max-w-lg grid-cols-4 gap-4 border-t border-line pt-6">
                {[
                  { n: 4, l: 'Subjects' },
                  { n: 24, l: 'Quests' },
                  { n: 198, l: 'Questions' },
                  { n: 17, l: 'Badges' },
                ].map((s) => (
                  <div key={s.l}>
                    <dt className="hud">{s.l}</dt>
                    <dd className="font-display text-3xl font-bold text-white"><CountUp value={s.n} /></dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Player card preview */}
            <div className="relative mx-auto w-full max-w-sm animate-float" aria-hidden="true">
              <div className="absolute -inset-6 -z-10 bg-gradient-to-br from-indigo-600/40 via-hot/20 to-lime/20 blur-3xl" />
              <Tilt>
              <div className="card chamfer border-line-bright p-5">
                <div className="flex items-center justify-between">
                  <span className="hud">Player card</span>
                  <span className="rounded bg-hot/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-hot uppercase">#3 in BSIT 3A</span>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <RankEmblem level={7} size="lg" animated />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-bold text-white uppercase">PacketNinja</p>
                    <p className="text-sm text-gold">Gold · Stack Sage</p>
                    <Progress value={68} className="mt-2 h-2" shine barClassName="from-gold to-lime" />
                    <p className="mt-1 font-mono text-[11px] text-slate-500">3,780 / 4,900 XP</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[
                    { i: Flame, v: '12', l: 'Streak', c: 'text-hot' },
                    { i: Medal, v: '9', l: 'Badges', c: 'text-gold' },
                    { i: Zap, v: '92%', l: 'Accuracy', c: 'text-lime' },
                  ].map((s) => (
                    <div key={s.l} className="rounded-lg bg-panel-2 p-2.5 ring-1 ring-line">
                      <s.i className={`mx-auto size-4 ${s.c}`} />
                      <p className="mt-1 font-display text-lg font-bold text-white">{s.v}</p>
                      <p className="hud text-[9px]">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-lime/30 bg-lime/10 p-3">
                  <Swords className="size-6 shrink-0 text-lime" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-display font-bold text-lime uppercase">Boss unlocked</p>
                    <p className="truncate text-slate-600">Subnetting Gauntlet · 10:00</p>
                  </div>
                  <span className="chamfer-sm bg-lime px-2.5 py-1 font-display text-xs font-bold text-lime-ink">FIGHT</span>
                </div>
              </div>
              </Tilt>
              <div className="absolute -top-5 -right-4 rotate-6 chamfer-sm bg-gold px-3 py-1.5 font-display text-sm font-bold text-[#2a1a00] shadow-lg animate-pop [animation-delay:600ms]">
                +85 XP
              </div>
              <div className="absolute -bottom-4 -left-5 -rotate-3 flex items-center gap-2 rounded-lg border border-line-bright bg-panel px-3 py-2 text-sm shadow-xl animate-pop [animation-delay:900ms]">
                <Crown className="size-4 text-gold" /> <span className="font-semibold text-white">Level up!</span>
              </div>
            </div>
          </div>
        </section>

        {/* Ticker */}
        <div className="relative -my-3 -rotate-1 border-y-2 border-lime bg-lime py-3 text-lime-ink select-none" aria-hidden="true">
          <div className="flex w-max animate-marquee gap-8 font-display text-lg font-bold whitespace-nowrap uppercase">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-8">{t}<span className="text-lime-ink/50">✦</span></span>
            ))}
          </div>
        </div>

        {/* Choose your class */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="reveal max-w-2xl">
            <p className="hud hud-tick">Choose your path</p>
            <h2 className="mt-2 text-4xl font-bold uppercase sm:text-5xl">Four subjects. Four ways to win.</h2>
            <p className="mt-3 text-slate-600">Every subject has its own quest line, matched to the BSIT curriculum, with a pretest and a posttest so you can see how much you&apos;ve grown.</p>
          </div>
          <div className="stagger mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUBJECTS.map((s) => (
              <div key={s.name} className="group card card-hover chamfer overflow-hidden p-6" style={{ ['--c' as string]: s.color }}>
                <div aria-hidden="true" className="absolute -top-16 -right-16 size-40 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60" style={{ background: s.color }} />
                <span className="chamfer-sm relative grid size-14 place-items-center text-[#070818] transition group-hover:scale-110 group-hover:-rotate-6" style={{ background: s.color, boxShadow: `0 0 30px -6px ${s.color}` }}>
                  <s.icon className="size-7" aria-hidden="true" />
                </span>
                <p className="hud mt-5" style={{ color: s.color }}>{s.role}</p>
                <h3 className="mt-1 text-2xl font-bold uppercase">{s.name}</h3>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                  {s.topics.map((t) => (
                    <li key={t} className="flex items-center gap-2"><span className="size-1.5 rotate-45" style={{ background: s.color }} />{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Game modes */}
        <section className="border-y border-line bg-panel/60 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="hud hud-tick">Game modes</p>
                <h2 className="mt-2 text-4xl font-bold uppercase sm:text-5xl">Built to keep you coming back</h2>
              </div>
              <p className="max-w-sm text-slate-600">Designed around how motivation actually works: you choose what to play, you can see yourself improving, and you compete with your classmates.</p>
            </div>
            <div className="stagger mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODES.map((m) => (
                <div key={m.title} className="group card card-hover p-6">
                  <div className="flex items-center justify-between">
                    <span className="chamfer-sm grid size-12 place-items-center bg-indigo-100 text-indigo-700 transition group-hover:bg-lime group-hover:text-lime-ink">
                      <m.icon className="size-6" aria-hidden="true" />
                    </span>
                    <span className="hud rounded border border-line px-2 py-0.5">{m.tag}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold uppercase">{m.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rank ladder */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="reveal text-center">
            <p className="hud hud-tick">The ladder</p>
            <h2 className="mt-2 text-4xl font-bold uppercase sm:text-5xl">Iron to Legend</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">Every quest, challenge and lab you finish earns XP. How far can you climb this semester?</p>
          </div>
          <ol className="stagger mt-14 grid grid-cols-4 items-end gap-y-10 sm:grid-cols-7">
            {TIERS.map((t, i) => (
              <li key={t.name} className="group flex flex-col items-center text-center">
                <RankEmblem level={t.min} size={i === TIERS.length - 1 ? 'lg' : 'md'} className="transition duration-300 group-hover:-translate-y-2 group-hover:scale-110" animated={i === TIERS.length - 1} />
                <p className="mt-3 font-display text-sm font-bold uppercase" style={{ color: t.from }}>{t.name}</p>
                <p className="font-mono text-[10px] text-slate-500">LV {t.min}+</p>
              </li>
            ))}
          </ol>
        </section>

        {/* How to start */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { i: UserPlus, n: '01', t: 'Create your player', d: 'Free, and it takes under a minute. Pick an alias if you like.' },
              { i: Swords, n: '02', t: 'Clear quests', d: 'Start with a pretest, then work your way to the boss.' },
              { i: Crown, n: '03', t: 'Climb the board', d: 'Keep your streak going, unlock badges and top your section.' },
            ].map((s) => (
              <div key={s.n} className="card relative overflow-hidden p-6">
                <span aria-hidden="true" className="absolute -top-4 -right-2 font-display text-8xl font-bold text-white/[0.04]">{s.n}</span>
                <s.i className="size-7 text-lime" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-bold uppercase">{s.t}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Instructors */}
        <section className="border-t border-line bg-panel/60">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="hud hud-tick">For IT faculty</p>
              <h2 className="mt-2 text-4xl font-bold uppercase">Spot learning gaps before the exam, not after.</h2>
              <p className="mt-3 text-slate-600">
                Create classes with a join code, write your own quests, and watch completion rates, item difficulty and score trends as they happen.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: BarChart3, t: 'Completion rates, item analysis and weekly trends for each class' },
                  { icon: GraduationCap, t: 'Built-in pretest and posttest, with t-tests and Cohen’s d' },
                  { icon: CheckCircle2, t: 'System Usability Scale and motivation survey, scored automatically' },
                  { icon: ShieldCheck, t: 'Ready for the Data Privacy Act: anonymous student codes and row-level security' },
                ].map((x) => (
                  <li key={x.t} className="flex items-start gap-3">
                    <x.icon className="mt-0.5 size-5 shrink-0 text-lime" aria-hidden="true" />
                    <span className="text-slate-700">{x.t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <p className="hud">Item analysis · IP Addressing &amp; Subnetting</p>
              <div className="mt-5 space-y-4">
                {([['Subnet mask for /26', 86], ['Usable hosts in /27', 71], ['Network address of .77/26', 42], ['First host of 10.0.0.32/28', 23]] as const).map(([q, p]) => (
                  <div key={q}>
                    <div className="flex justify-between text-sm"><span className="font-medium text-slate-700">{q}</span><span className="font-mono font-bold text-white">{p}%</span></div>
                    <Progress value={p} className="mt-1.5" color={p < 40 ? '#ff3d7f' : p < 70 ? '#ffc53d' : '#c4ff3d'} />
                  </div>
                ))}
              </div>
              <p className="mt-5 flex items-center gap-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
                <EyeOff className="size-4 shrink-0" aria-hidden="true" /> Students only ever see their own results.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative isolate overflow-hidden px-4 py-24 text-center sm:px-6">
          <div aria-hidden="true" className="arena-floor -z-10 opacity-60" />
          <p className="reveal hud text-lime">Player 1, are you ready?</p>
          <h2 className="reveal mx-auto mt-3 max-w-3xl text-5xl font-bold uppercase sm:text-6xl">Your first quest is waiting.</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">Free for every DOrSU BSIT student. Install it on your phone and review anywhere on campus.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <LinkButton href={playHref} variant="accent" size="lg" className="shine">
              {user ? 'Enter the arena' : 'Create free account'} <ChevronRight className="size-5" aria-hidden="true" />
            </LinkButton>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} DOrSU IT Quest · Davao Oriental State University, City of Mati</p>
          <p>Personal data is processed in accordance with RA 10173 (Data Privacy Act of 2012). · <a href="/privacy" className="font-semibold text-slate-700 underline hover:text-lime">Privacy Policy</a></p>
        </div>
      </footer>
    </div>
  )
}
