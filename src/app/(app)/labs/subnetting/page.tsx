import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Binary } from 'lucide-react'
import { PageHeader } from '@/components/ui/misc'
import { SubnetTrainer } from './trainer-loader'

export const metadata: Metadata = { title: 'Subnetting Trainer' }

export default function SubnettingPage() {
  return (
    <>
      <Link href="/labs" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Labs
      </Link>
      <PageHeader title="Subnetting Trainer" description="Calculate the subnet details for the given host address. Answers are verified on the server with real IPv4 math." icon={Binary} />
      <SubnetTrainer />
    </>
  )
}
