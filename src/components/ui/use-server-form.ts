'use client'

import { startTransition, useActionState, type FormEvent } from 'react'
import type { ActionState } from '@/lib/types'

/**
 * Like useActionState, but submits via onSubmit so React does NOT auto-reset
 * the form — users keep what they typed when the server returns an error.
 */
export function useServerForm(action: (state: ActionState, formData: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(action, null)
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => dispatch(fd))
  }
  return { state, onSubmit, pending }
}
