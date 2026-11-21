import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Binary, Code2, FlaskConical } from 'lucide-react'
import { PageHeader, Pill } from '@/components/ui/misc'
import { requireUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Labs' }

export default async function LabsPage() {
  const { supabase, profile } = await requireUser()
  const { count } = await supabase.from('lab_results').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('correct', true)

  const labs = [
    {
      href: '/labs/subnetting', icon: Binary, color: '#0EA5E9', subject: 'Networking', title: 'Subnetting Trainer',
      text: 'Unlimited random IPv4 problems. Find the network, broadcast, host range and host count — verified by the server.',
      meta: `${count ?? 0} solved · +10 XP each (max 150 XP/day)`,
    },
    {
      href: '/labs/playground', icon: Code2, color: '#F97316', subject: 'Web Development', title: 'Web Playground',
      text: 'Write HTML, CSS and JavaScript side by side with a live preview, and complete mini-tasks that check your code automatically.',
      meta: 'Practice mode · works offline',
    },
  ]

  return (
    <>
      <PageHeader title="Labs" description="Hands-on simulations to practice skills the way professionals use them." icon={FlaskConical} />
      <div className="grid gap-5 md:grid-cols-2">
        {labs.map((l) => (
          <Link key={l.href} href={l.href} className="card group flex flex-col p-6 transition hover:-translate-y-1 hover:shadow-clay-lg">
            <span className="grid size-14 place-items-center rounded-2xl text-white shadow-press" style={{ background: l.color }}><l.icon className="size-7" aria-hidden="true" /></span>
            <Pill tone="slate" className="mt-4 self-start">{l.subject}</Pill>
            <h2 className="mt-2 text-xl font-bold">{l.title}</h2>
            <p className="mt-1 flex-1 text-slate-600">{l.text}</p>
            <div className="mt-5 flex items-center justify-between border-t border-indigo-50 pt-4 text-sm">
              <span className="font-semibold text-slate-600">{l.meta}</span>
              <ArrowRight className="size-5 text-indigo-600 transition group-hover:translate-x-1" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
