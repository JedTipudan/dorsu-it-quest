import type { Metadata } from 'next'
import Link from 'next/link'
import { Alert } from '@/components/ui/misc'
import { logout } from '../actions'
import { GoogleButton, LoginForm, OrDivider } from '../forms'
import { CaptchaWidget } from '../captcha'

export const metadata: Metadata = { title: 'Log in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  return (
    <>
      <p className="hud hud-tick">Player login</p>
      <h1 className="mt-2 text-4xl font-bold uppercase">Welcome back</h1>
      <p className="mt-1 mb-6 text-slate-600">Your streak is waiting. Pick up where you left off.</p>
      {error && (
        <Alert tone="error" className="mb-4">
          {error}
          <form action={logout} className="mt-2">
            <button type="submit" className="font-semibold underline">Log out</button>
          </form>
        </Alert>
      )}
      <GoogleButton intent="login" next={next} />
      <p className="mt-2 text-center text-[11px] text-slate-500">
        First time with Google? It creates your player account. By continuing you accept the study&apos;s data terms (RA 10173) shown on the <Link href="/register" className="underline">sign-up page</Link>.
      </p>
      <OrDivider />
      <LoginForm next={next} />
      <CaptchaWidget />
      <p className="mt-6 text-center text-sm text-slate-600">
        New to IT Quest? <Link href="/register" className="font-semibold text-indigo-700 hover:underline">Create an account</Link>
      </p>
    </>
  )
}
