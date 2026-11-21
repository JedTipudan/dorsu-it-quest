'use client'

import { Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import type { ComponentProps } from 'react'
import { Button, type ButtonSize, type ButtonVariant } from './button'

export function SubmitButton({
  children, pendingText, variant, size, pending: pendingProp, ...props
}: ComponentProps<'button'> & { pendingText?: string; variant?: ButtonVariant; size?: ButtonSize; pending?: boolean }) {
  const status = useFormStatus()
  const pending = pendingProp ?? status.pending
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  )
}
