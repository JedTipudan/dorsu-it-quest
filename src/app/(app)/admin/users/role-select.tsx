'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import type { Role } from '@/lib/types'
import { setUserRole } from '@/app/(app)/instructor/actions'

export function RoleSelect({ userId, role, disabled }: { userId: string; role: Role; disabled?: boolean }) {
  const [pending, startTransition] = useTransition()
  return (
    <select
      aria-label="Role"
      defaultValue={role}
      disabled={disabled || pending}
      onChange={(e) => {
        const next = e.target.value as Role
        startTransition(async () => {
          const r = await setUserRole(userId, next)
          if (r.error) toast.error(r.error)
          else toast.success(`Role changed to ${next}.`)
        })
      }}
      className="h-9 rounded-lg border-2 border-indigo-100 bg-panel px-2 text-sm font-semibold capitalize disabled:opacity-60"
    >
      <option value="student">Student</option>
      <option value="instructor">Instructor</option>
      <option value="admin">Admin</option>
    </select>
  )
}
