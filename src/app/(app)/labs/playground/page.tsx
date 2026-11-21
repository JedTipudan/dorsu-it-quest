import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Code2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/misc'
import { Playground } from './playground-loader'

export const metadata: Metadata = { title: 'Web Playground' }

export default function PlaygroundPage() {
  return (
    <>
      <Link href="/labs" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Labs
      </Link>
      <PageHeader title="Web Playground" description="Write HTML, CSS and JavaScript and see the result instantly. Complete the mini-tasks — they are checked automatically as you type." icon={Code2} />
      <Playground />
    </>
  )
}
