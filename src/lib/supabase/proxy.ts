import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/env'

const PROTECTED = [
  '/dashboard', '/checkin', '/subjects', '/quests', '/challenge', '/labs', '/leaderboard',
  '/badges', '/profile', '/surveys', '/feedback', '/instructor', '/admin',
]
const AUTH_PAGES = ['/login', '/register']

/** Refreshes the Supabase session cookie and guards private routes. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (!isSupabaseConfigured) return response

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Do not put code between createServerClient and getUser().
  const { data } = await supabase.auth.getClaims()
  const isAuthed = Boolean(data?.claims?.sub)
  const path = request.nextUrl.pathname

  if (!isAuthed && PROTECTED.some((p) => path === p || path.startsWith(p + '/'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`
    return NextResponse.redirect(url)
  }

  // Let an error message on /login be shown even to a signed-in user (prevents redirect loops).
  if (isAuthed && AUTH_PAGES.includes(path) && !request.nextUrl.searchParams.has('error')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
