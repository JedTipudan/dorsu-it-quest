import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ResetPasswordForm } from '../forms'

export const metadata: Metadata = { title: 'Set a new password' }

export default async function ResetPasswordPage() {
  const { user } = await getSession()
  if (!user) redirect('/login?error=Your reset link has expired. Please request a new one.')
  return (
    <>
      <h1 className="text-3xl font-bold">Choose a new password</h1>
      <p className="mt-1 mb-6 text-slate-600">Signed in as {user.email}.</p>
      <ResetPasswordForm />
    </>
  )
}
