import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from '../forms'

export const metadata: Metadata = { title: 'Forgot password' }

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Reset your password</h1>
      <p className="mt-1 mb-6 text-slate-600">Enter your email and we&apos;ll send you a reset link.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/login" className="font-semibold text-indigo-700 hover:underline">Back to log in</Link>
      </p>
    </>
  )
}
