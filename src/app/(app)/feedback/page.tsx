import type { Metadata } from 'next'
import { MessageSquare, Star } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader, Pill } from '@/components/ui/misc'
import { requireUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/utils'
import { FeedbackForm } from './feedback-form'

export const metadata: Metadata = { title: 'Feedback' }

export default async function FeedbackPage() {
  const { supabase, profile } = await requireUser()
  const { data } = await supabase.from('feedback').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20)

  return (
    <>
      <PageHeader title="Feedback & suggestions" description="Tell us what works and what to improve. Your suggestions shape the next version of DOrSU IT Quest." icon={MessageSquare} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Send feedback</CardTitle></CardHeader>
          <CardBody><FeedbackForm /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Your previous feedback</CardTitle></CardHeader>
          <CardBody>
            {(data ?? []).length === 0 ? (
              <p className="text-sm text-slate-600">Nothing yet.</p>
            ) : (
              <ul className="space-y-3">
                {(data ?? []).map((f) => (
                  <li key={f.id} className="rounded-xl bg-indigo-50/60 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Pill tone="slate" className="capitalize">{f.category}</Pill>
                      <span className="flex items-center gap-0.5 text-amber-500" aria-label={`${f.rating} of 5 stars`}>
                        {Array.from({ length: f.rating }, (_, i) => <Star key={i} className="size-3.5 fill-current" aria-hidden="true" />)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-slate-700">{f.message}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(f.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
