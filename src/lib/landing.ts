import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { homeFor } from '@/lib/auth'

/**
 * Where a freshly signed-in user should go: each role to its own home, and new Google players
 * (no year level / section yet; Google doesn't provide them) to their profile to finish it.
 */
export async function landingPath(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return '/login'
  const { data: profile } = await supabase.from('profiles').select('role, year_level').eq('id', user.id).maybeSingle()
  if (profile?.role === 'student' && profile.year_level === null) return '/profile?complete=1'
  return homeFor(profile?.role)
}
