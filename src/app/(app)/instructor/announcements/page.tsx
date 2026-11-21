import type { Metadata } from 'next'
import { Megaphone, Pin } from 'lucide-react'
import { BriefingCard, type Briefing } from '@/components/staff/briefing-card'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, EmptyState, PageHeader } from '@/components/ui/misc'
import { requireStaff } from '@/lib/auth'
import { BriefingComposer, DeleteBriefing } from './composer'

export const metadata: Metadata = { title: 'Briefings' }

const isExpired = (b: Briefing) => b.expires_at !== null && new Date(b.expires_at).getTime() < Date.now()

export default async function BriefingsPage() {
  const { supabase, profile } = await requireStaff()
  const isAdmin = profile.role === 'admin'
  const classQuery = supabase.from('classes').select('id, name').order('created_at', { ascending: false })
  const [{ data: classes }, { data, error }] = await Promise.all([
    isAdmin ? classQuery : classQuery.eq('instructor_id', profile.id),
    supabase.from('announcements').select('*, classes(name), profiles(display_name, full_name)').order('created_at', { ascending: false }).limit(100),
  ])
  const list = (data ?? []) as Briefing[]

  return (
    <>
      <PageHeader title="Briefings" description="Post announcements to a class. Students see them at the top of their dashboard, like a game's mission briefing." icon={Megaphone} />
      {error && <Alert tone="warning" className="mb-6">Briefings need a one-time database upgrade: run <code>supabase/upgrade-staff-tools.sql</code> in the Supabase SQL Editor.</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <Card className="self-start">
          <CardHeader><CardTitle>New briefing</CardTitle></CardHeader>
          <CardBody><BriefingComposer classes={classes ?? []} isAdmin={isAdmin} /></CardBody>
        </Card>
        <section aria-labelledby="posted-h">
          <h2 id="posted-h" className="mb-3 text-xl font-bold uppercase">Posted <span className="text-slate-400">({list.length})</span></h2>
          {list.length === 0 ? (
            <EmptyState icon={Megaphone} title="No briefings yet" description="Your first announcement will appear here and on your students' dashboards." />
          ) : (
            <ul className="space-y-3">
              {list.map((b) => {
                const expired = isExpired(b)
                return (
                  <li key={b.id} className={expired ? 'opacity-50' : undefined}>
                    <BriefingCard b={b} meta={
                      <>
                        {b.pinned && <Pin className="size-3.5" aria-label="Pinned" />}
                        <span>{b.classes?.name ?? 'Everyone'}</span>
                        {expired && <span className="text-hot">· expired</span>}
                      </>
                    } action={(b.author_id === profile.id || isAdmin) ? <DeleteBriefing id={b.id} /> : null} />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
