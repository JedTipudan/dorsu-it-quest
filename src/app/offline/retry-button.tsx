'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RetryButton() {
  return (
    <Button className="mt-6" onClick={() => window.location.reload()}>
      <RefreshCw className="size-4" aria-hidden="true" /> Try again
    </Button>
  )
}
