import type { Metadata } from 'next'
import Link from 'next/link'
import { GoogleButton, OrDivider, RegisterForm } from '../forms'

export const metadata: Metadata = { title: 'Create account' }

export default function RegisterPage() {
  return (
    <>
      <p className="hud hud-tick">New player</p>
      <h1 className="mt-2 text-4xl font-bold uppercase">Create your player</h1>
      <p className="mt-1 mb-6 text-slate-600">Free for DOrSU BSIT students. You start at Iron, and how far you climb is up to you.</p>
      <GoogleButton intent="register" />
      <OrDivider />
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account? <Link href="/login" className="font-semibold text-indigo-700 hover:underline">Log in</Link>
      </p>
    </>
  )
}
