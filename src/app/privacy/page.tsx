import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/logo'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How DOrSU IT Quest collects, uses and protects personal data under the Data Privacy Act of 2012 (RA 10173).',
}

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL

const SECTIONS: { h: string; body: React.ReactNode }[] = [
  {
    h: 'Who we are',
    body: <p>DOrSU IT Quest is a gamified learning platform for BS Information Technology students of Davao Oriental State University (DOrSU), City of Mati. It is used to review core major subjects and, with consent, to study how gamification affects learning.</p>,
  },
  {
    h: 'What we collect',
    body: (
      <ul>
        <li><b>Account details</b>: your name, display name (alias), email address, year level and section. If you use <b>Sign in with Google</b>, we receive only your Google account&apos;s name and email address. We never receive your Google password and never access your Gmail, Drive or contacts.</li>
        <li><b>Learning activity</b>: quest and challenge answers, scores, XP, badges, daily check-ins and lab results.</li>
        <li><b>Survey answers</b>: the System Usability Scale and the motivation and engagement survey, plus any feedback you send.</li>
        <li><b>Class membership</b>: the classes you join with a join code.</li>
      </ul>
    ),
  },
  {
    h: 'How we use it',
    body: (
      <ul>
        <li>To run the platform: sign-in, progress tracking, leaderboards, badges and feedback on your answers.</li>
        <li>To let your instructor monitor the progress of their own class and plan remediation.</li>
        <li>For the DOrSU IT Quest research study, only if you gave consent when signing up. Results are reported only in aggregate or by anonymous student code (e.g. <code>ITQ-XXXXXX</code>), never by name.</li>
      </ul>
    ),
  },
  {
    h: 'Who can see it',
    body: (
      <ul>
        <li><b>You</b> can see all of your own data.</li>
        <li><b>Your instructors</b> can see the progress of students in their own classes only.</li>
        <li><b>Administrators</b> manage the platform. Only administrators can access the key that links anonymous codes to names, and it is stored separately from research data.</li>
        <li><b>Other students</b> see only your display name, level and XP on leaderboards. You can use an alias or hide yourself from public rankings in your Profile.</li>
        <li>We do <b>not</b> sell or share personal data with advertisers or other third parties.</li>
      </ul>
    ),
  },
  {
    h: 'Where it is stored',
    body: <p>Data is stored in a secured Supabase (PostgreSQL) database with row-level security, and the app is served over HTTPS. Access is limited to the roles described above.</p>,
  },
  {
    h: 'Your rights (RA 10173)',
    body: <p>Under the Data Privacy Act of 2012 you may access, correct, or request deletion of your personal data, and you may withdraw from the study at any time. Withdrawing does not affect your grades or standing. You can edit your profile details yourself; for other requests, contact your instructor or the research team{CONTACT ? <> at <a href={`mailto:${CONTACT}`}>{CONTACT}</a></> : null}.</p>,
  },
  {
    h: 'Retention',
    body: <p>Data is kept for the duration of the course and the study. After the study, research data is kept only in anonymized form, and accounts may be deleted on request.</p>,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-arena/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-white">← Home</Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="hud hud-tick">Legal</p>
        <h1 className="mt-2 flex items-center gap-3 text-4xl font-bold uppercase"><ShieldCheck className="size-9 text-lime" aria-hidden="true" /> Privacy Policy</h1>
        <p className="mt-2 text-slate-600">Last updated: 21 November 2026 · Applies to DOrSU IT Quest and its &quot;Sign in with Google&quot; feature.</p>
        <div className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.h} className="card p-6 [&_a]:text-lime [&_a]:underline [&_li]:mt-1.5 [&_p]:text-slate-700 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-slate-700">
              <h2 className="mb-3 text-xl font-bold uppercase">{s.h}</h2>
              {s.body}
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
