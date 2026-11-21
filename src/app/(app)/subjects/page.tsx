import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { SubjectIcon } from '@/components/game/bits'
import { EmptyState, PageHeader, Progress } from '@/components/ui/misc'
import { isStaffRole, requireUser } from '@/lib/auth'
import { getSubjectsProgress } from '@/lib/data'

export const metadata: Metadata = { title: 'Subjects' }

export default async function SubjectsPage() {
  const { supabase, profile } = await requireUser()
  const subjects = await getSubjectsProgress(supabase, profile.id, isStaffRole(profile.role))

  return (
    <>
      <PageHeader title="Subjects" description="Pick a core major subject and work through its quest line. Each quest unlocks the next one." icon={BookOpen} />
      {subjects.length === 0 ? (
        <EmptyState icon={BookOpen} title="No subjects yet" description="Run the database seed (supabase/seed.sql) to load the BSIT curriculum." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {subjects.map((s) => (
            <Link key={s.id} href={`/subjects/${s.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-clay-lg">
              <div className="h-2" style={{ background: s.color }} />
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <SubjectIcon icon={s.icon} color={s.color} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">{s.short_name}</p>
                    <h2 className="text-xl font-bold">{s.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{s.description}</p>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-sm font-semibold">
                    <span>{s.passed} of {s.total} quests passed</span>
                    <span style={{ color: s.color }}>{s.percent}%</span>
                  </div>
                  <Progress value={s.percent} color={s.color} label={`${s.name} progress`} />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-indigo-50 pt-4 text-sm">
                  <span className="truncate text-slate-600">{s.next ? <>Next: <strong className="text-indigo-950">{s.next.title}</strong></> : s.total ? 'Quest line complete!' : 'Coming soon'}</span>
                  <ArrowRight className="size-5 shrink-0 text-indigo-600 transition group-hover:translate-x-1" aria-hidden="true" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
