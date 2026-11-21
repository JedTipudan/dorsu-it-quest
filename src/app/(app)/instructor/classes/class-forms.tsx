'use client'

import { useEffect, useState, useTransition } from 'react'
import { Check, Copy, RefreshCw, Trash2, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Alert } from '@/components/ui/misc'
import { SubmitButton } from '@/components/ui/submit-button'
import { useServerForm } from '@/components/ui/use-server-form'
import type { ClassRow, Subject } from '@/lib/types'
import { createClass, deleteClass, regenerateJoinCode, removeStudent, updateClass } from '../actions'

function GroupSelect({ defaultValue = 'none' }: { defaultValue?: string }) {
  return (
    <Field label="Research group" htmlFor="group_type" hint="Used for the pretest–posttest comparison.">
      <Select id="group_type" name="group_type" defaultValue={defaultValue}>
        <option value="none">Not part of the study</option>
        <option value="experimental">Experimental (uses the platform)</option>
        <option value="control">Control (conventional review)</option>
      </Select>
    </Field>
  )
}

export function CreateClassForm({ subjects }: { subjects: Subject[] }) {
  const { state, onSubmit, pending } = useServerForm(createClass)
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Class name" htmlFor="name">
        <Input id="name" name="name" required minLength={2} maxLength={80} placeholder="BSIT 3A – Networking 2" />
      </Field>
      <Field label="Subject" htmlFor="subject_id">
        <Select id="subject_id" name="subject_id" required defaultValue={subjects[0]?.id}>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <GroupSelect />
      <Field label="Academic year" htmlFor="academic_year">
        <Input id="academic_year" name="academic_year" defaultValue="2026-2027" required maxLength={20} />
      </Field>
      <SubmitButton pending={pending} className="w-full" pendingText="Creating…">Create class</SubmitButton>
    </form>
  )
}

export function EditClassForm({ cls }: { cls: ClassRow }) {
  const { state, onSubmit, pending } = useServerForm(updateClass.bind(null, cls.id))
  useEffect(() => { if (state?.ok) toast.success(state.message) }, [state])
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Class name" htmlFor="name"><Input id="name" name="name" defaultValue={cls.name} required maxLength={80} /></Field>
      <GroupSelect defaultValue={cls.group_type} />
      <Field label="Academic year" htmlFor="academic_year"><Input id="academic_year" name="academic_year" defaultValue={cls.academic_year} required maxLength={20} /></Field>
      <SubmitButton pending={pending} pendingText="Saving…">Save</SubmitButton>
    </form>
  )
}

export function JoinCode({ classId, code }: { classId: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-xl bg-white/15 px-4 py-2 font-mono text-2xl font-bold tracking-[0.2em] ring-1 ring-white/30">{code}</span>
      <Button variant="secondary" size="sm" onClick={async () => {
        try {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch { toast.error('Copy failed — select the code manually.') }
      }}>
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => {
        if (!window.confirm('Generate a new code? The old code will stop working.')) return
        startTransition(async () => {
          const r = await regenerateJoinCode(classId)
          if (r?.error) toast.error(r.error)
          else toast.success('New join code generated.')
        })
      }}>
        <RefreshCw className="size-4" aria-hidden="true" /> New code
      </Button>
    </div>
  )
}

export function DeleteClassButton({ classId, name }: { classId: string; name: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button variant="danger" size="sm" disabled={pending} onClick={() => {
      if (window.confirm(`Delete "${name}"? Students stay registered, but the class and its roster are removed.`)) startTransition(() => deleteClass(classId))
    }}>
      <Trash2 className="size-4" aria-hidden="true" /> Delete class
    </Button>
  )
}

export function RemoveStudentButton({ classId, studentId, name }: { classId: string; studentId: string; name: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button type="button" disabled={pending} aria-label={`Remove ${name} from class`} title="Remove from class"
      className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
      onClick={() => { if (window.confirm(`Remove ${name} from this class?`)) startTransition(() => removeStudent(classId, studentId)) }}>
      <UserMinus className="size-4" />
    </button>
  )
}
