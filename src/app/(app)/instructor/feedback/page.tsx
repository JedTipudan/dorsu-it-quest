import type { Metadata } from 'next'
import Link from 'next/link'
import { Inbox, Star } from 'lucide-react'
import { EmptyState, PageHeader, Pill, StatCard } from '@/components/ui/misc'
import { requireStaff } from '@/lib/auth'
import { cn, formatDateTime } from '@/lib/utils'
import { DeleteFeedbackButton } from './delete-button'

export const metadata: Metadata = { title: 'Feedback inbox' }

const CATEGORIES = ['general', 'content', 'usability', 'feature', 'bug'] as const

export default async function FeedbackInbox({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams
  const { supabase, profile } = await requireStaff()
  const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(500)
  const all = data ?? []
  const shown = CATEGORIES.includes(category as (typeof CATEGORIES)[number]) ? all.filter((f) => f.category === category) : all
  const avg = all.length ? all.reduce((a, f) => a + f.rating, 0) / all.length : 0

  return (
    <>
      <PageHeader title="Feedback inbox" description="Suggestions and issues from students — input for the study's recommendations (Objective 5)." icon={Inbox} />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Responses" value={all.length} icon={Inbox} />
        <StatCard label="Avg rating" value={avg ? `${avg.toFixed(2)} / 5` : '—'} icon={Star} tone="orange" />
        <StatCard label="Bug reports" value={all.filter((f) => f.category === 'bug').length} icon={Inbox} tone="violet" />
        <StatCard label="Feature ideas" value={all.filter((f) => f.category === 'feature').length} icon={Inbox} tone="emerald" />
      </section>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {[undefined, ...CATEGORIES].map((c) => (
          <Link key={c ?? 'all'} href={c ? `/instructor/feedback?category=${c}` : '/instructor/feedback'}
            className={cn('inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold capitalize whitespace-nowrap', (category ?? undefined) === c ? 'bg-indigo-600 text-white' : 'bg-panel text-slate-600 ring-1 ring-indigo-100')}>
            {c ?? 'All'}
          </Link>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={Inbox} title="No feedback yet" description="Student feedback submitted from the Feedback page appears here." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((f) => (
            <li key={f.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <Pill tone={f.category === 'bug' ? 'red' : f.category === 'feature' ? 'emerald' : 'slate'} className="capitalize">{f.category}</Pill>
                <span className="flex items-center gap-0.5 text-amber-500" aria-label={`${f.rating} of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn('size-4', i < f.rating ? 'fill-current' : 'text-slate-200')} aria-hidden="true" />)}
                </span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-slate-700">{f.message}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">{formatDateTime(f.created_at)}</p>
                {profile.role === 'admin' && <DeleteFeedbackButton id={f.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
