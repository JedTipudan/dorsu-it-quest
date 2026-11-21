import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { homeFor } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

/** Handles Google sign-in, e-mail confirmation and password recovery (PKCE code or token hash). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const rawNext = searchParams.get('next') ?? ''
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null

  const supabase = await createClient()
  let error: { message: string } | null = null

  if (code) {
    ;({ error } = await supabase.auth.exchangeCodeForSession(code))
  } else if (tokenHash && type) {
    ;({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }))
  } else {
    error = { message: 'Missing verification code.' }
  }

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('That link is invalid or has expired. Please try again.')}`)
  }
  if (type === 'recovery') return NextResponse.redirect(`${origin}/reset-password`)
  if (next) return NextResponse.redirect(`${origin}${next}`)

  // No specific page requested: send each role home. New Google players have no year level /
  // section yet (Google doesn't provide them), so ask them to finish their profile first.
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role, year_level').eq('id', user.id).maybeSingle()
    : { data: null }
  if (profile?.role === 'student' && profile.year_level === null) return NextResponse.redirect(`${origin}/profile?complete=1`)
  return NextResponse.redirect(`${origin}${homeFor(profile?.role)}`)
}
