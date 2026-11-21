import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PageHeader, Pill } from '@/components/ui/misc'
import { requireStaff } from '@/lib/auth'
import type { ClassRow, Subject } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { CreateClassForm } from './class-forms'

export const metadata: Metadata = { title: 'Classes' }

export default async function ClassesPage() {
  const { supabase, profile } = await requireStaff()
  const q = supabase.from('classes').select('*, subjects(name, color), class_members(count)').order('created_at', { ascending: false })
  const [{ data: classes }, { data: subjects }] = await Promise.all([
    profile.role === 'admin' ? q : q.eq('instructor_id', profile.id),
    supabase.from('subjects').select('*').order('sort_order'),
  ])
  type C = ClassRow & { subjects: { name: string; color: string } | null; class_members: { count: number }[] }
  const list = (classes ?? []) as unknown as C[]

  return (
    <>
      <PageHeader title="Classes" description="Each class has a join code. Mark sections as experimental or control groups for the quasi-experimental study." icon={Users} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {list.length === 0 ? (
            <EmptyState icon={Users} title="No classes yet" description="Create your first class using the form." />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((c) => (
                <li key={c.id}>
                  <Link href={`/instructor/classes/${c.id}`} className="card flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-clay-lg">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-sans text-lg font-bold">{c.name}</h2>
                      <ArrowRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                      <span className="size-2.5 rounded-full" style={{ background: c.subjects?.color }} aria-hidden="true" />{c.subjects?.name} · {c.academic_year}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Pill tone="indigo">{c.class_members?.[0]?.count ?? 0} students</Pill>
                      {c.group_type !== 'none' && <Pill tone={c.group_type === 'experimental' ? 'violet' : 'slate'} className="capitalize">{c.group_type}</Pill>}
                      <span className="ml-auto font-mono text-sm font-bold text-indigo-700">{c.join_code}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Created {formatDate(c.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle>Create a class</CardTitle></CardHeader>
          <CardBody><CreateClassForm subjects={(subjects ?? []) as Subject[]} /></CardBody>
        </Card>
      </div>
    </>
  )
}
