'use client'

import { useEffect, useTransition } from 'react'
import { LogOut, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/input'
import { Alert } from '@/components/ui/misc'
import { SubmitButton } from '@/components/ui/submit-button'
import { useServerForm } from '@/components/ui/use-server-form'
import type { ActionState, Profile } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { joinClass, leaveClass, updateProfile } from '../actions'

function useToastResult(state: ActionState) {
  useEffect(() => {
    if (state?.ok && state.message) toast.success(state.message)
  }, [state])
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const { state, onSubmit, pending } = useServerForm(updateProfile)
  useToastResult(state)
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {state?.error && <Alert tone="error" className="sm:col-span-2">{state.error}</Alert>}
      <Field label="Full name" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} required minLength={2} maxLength={120} autoComplete="name" />
      </Field>
      <Field label="Display name" htmlFor="display_name" hint="Shown on leaderboards. An alias is fine.">
        <Input id="display_name" name="display_name" defaultValue={profile.display_name} required minLength={2} maxLength={40} />
      </Field>
      <Field label="Year level" htmlFor="year_level">
        <Select id="year_level" name="year_level" defaultValue={profile.year_level?.toString() ?? ''}>
          <option value="">—</option>
          {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </Select>
      </Field>
      <Field label="Section" htmlFor="section">
        <Input id="section" name="section" defaultValue={profile.section ?? ''} maxLength={30} placeholder="BSIT 3A" />
      </Field>
      <Field label="Email" htmlFor="email" hint="Email cannot be changed here.">
        <Input id="email" defaultValue={profile.email ?? ''} disabled />
      </Field>
      <label htmlFor="show_on_leaderboard" className="flex items-start gap-3 rounded-xl border-2 border-indigo-100 p-3 text-sm sm:col-span-2">
        <input id="show_on_leaderboard" name="show_on_leaderboard" type="checkbox" defaultChecked={profile.show_on_leaderboard} className="mt-0.5 size-5 shrink-0 accent-indigo-600" />
        <span>
          <span className="block font-semibold text-indigo-950">Show me on public leaderboards</span>
          <span className="text-slate-600">Turn this off to opt out of rankings. You still earn XP and badges, and you can always see your own position.</span>
        </span>
      </label>
      <div className="sm:col-span-2"><SubmitButton pending={pending} pendingText="Saving…">Save changes</SubmitButton></div>
    </form>
  )
}

export function ClassesCard({ classes }: { classes: { id: string; name: string; subject: string; joined_at: string }[] }) {
  const { state, onSubmit, pending } = useServerForm(joinClass)
  const [leaving, startTransition] = useTransition()
  useToastResult(state)
  return (
    <Card>
      <CardHeader><CardTitle>My classes</CardTitle></CardHeader>
      <CardBody className="space-y-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field label="Join a class" htmlFor="code" hint="Ask your instructor for the 6-character class code." className="flex-1">
            <Input id="code" name="code" required minLength={6} maxLength={6} placeholder="e.g. A1B2C3" className="font-mono uppercase" autoComplete="off" autoCapitalize="characters" />
          </Field>
          <SubmitButton pending={pending} pendingText="Joining…" className="sm:mb-6">Join</SubmitButton>
        </form>
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {classes.length === 0 ? (
          <p className="text-sm text-slate-600">You haven&apos;t joined any class yet.</p>
        ) : (
          <ul className="divide-y divide-indigo-50">
            {classes.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><Users className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.subject} · joined {formatDate(c.joined_at)}</p>
                </div>
                <Button variant="ghost" size="sm" disabled={leaving} onClick={() => {
                  if (window.confirm(`Leave ${c.name}?`)) startTransition(() => leaveClass(c.id))
                }}>
                  <LogOut className="size-4" aria-hidden="true" /> Leave
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
