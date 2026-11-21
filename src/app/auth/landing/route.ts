import { NextResponse, type NextRequest } from 'next/server'
import { landingPath } from '@/lib/landing'
import { createClient } from '@/lib/supabase/server'

/** After an in-page sign-in (Google button), send the user to the right home for their role. */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  const supabase = await createClient()
  return NextResponse.redirect(`${origin}${await landingPath(supabase)}`)
}
