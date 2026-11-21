'use client'

import { useEffect, useRef, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Alert } from '@/components/ui/misc'
import { SubmitButton } from '@/components/ui/submit-button'
import { useServerForm } from '@/components/ui/use-server-form'
import { createAnnouncement, deleteAnnouncement } from '../actions'

export function BriefingComposer({ classes, isAdmin }: { classes: { id: string; name: string }[]; isAdmin: boolean }) {
  const { state, onSubmit, pending } = useServerForm(createAnnouncement)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message)
      formRef.current?.reset()
    }
  }, [state])

  const noTarget = !isAdmin && classes.length === 0
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {state?.error && <Alert tone="error" className="sm:col-span-2">{state.error}</Alert>}
      {noTarget && <Alert tone="warning" className="sm:col-span-2">Create a class first. Briefings are sent to the students of one of your classes.</Alert>}
      <Field label="Send to" htmlFor="class_id">
        <Select id="class_id" name="class_id" defaultValue={isAdmin ? 'all' : classes[0]?.id} required>
          {isAdmin && <option value="all">Everyone (all students)</option>}
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Type" htmlFor="tone">
        <Select id="tone" name="tone" defaultValue="info">
          <option value="info">Info · general update</option>
          <option value="event">Event · quiz, deadline, review session</option>
          <option value="urgent">Urgent · needs action now</option>
        </Select>
      </Field>
      <Field label="Headline" htmlFor="title" className="sm:col-span-2">
        <Input id="title" name="title" required minLength={3} maxLength={100} placeholder="e.g. Subnetting long quiz on Friday" />
      </Field>
      <Field label="Message" htmlFor="body" className="sm:col-span-2" hint="Tip: link the quest to practise, e.g. “Clear the IP Addressing boss before Friday.”">
        <Textarea id="body" name="body" maxLength={1000} placeholder="What should players do, and by when?" />
      </Field>
      <Field label="Show for" htmlFor="expires_days">
        <Select id="expires_days" name="expires_days" defaultValue="7">
          <option value="1">1 day</option>
          <option value="3">3 days</option>
          <option value="7">1 week</option>
          <option value="14">2 weeks</option>
          <option value="30">30 days</option>
          <option value="0">Until I delete it</option>
        </Select>
      </Field>
      <label htmlFor="pinned" className="flex items-center gap-3 self-end rounded-lg border border-line bg-panel-2 p-3 text-sm text-slate-700">
        <input id="pinned" name="pinned" type="checkbox" className="size-5 accent-lime" /> Pin to the top of the dashboard
      </label>
      <div className="sm:col-span-2">
        <SubmitButton pending={pending} variant="accent" disabled={noTarget} pendingText="Posting…">Post briefing</SubmitButton>
      </div>
    </form>
  )
}

export function DeleteBriefing({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button type="button" disabled={pending} aria-label="Delete briefing" title="Delete"
      onClick={() => start(async () => { const r = await deleteAnnouncement(id); if (r.error) toast.error(r.error) })}
      className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40">
      <Trash2 className="size-4" />
    </button>
  )
}
