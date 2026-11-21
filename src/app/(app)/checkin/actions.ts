'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import type { Response } from '@/lib/types'
import { errorMessage } from '@/lib/utils'
import type { ByteResult, ClaimResult } from './types'

/** All rewards are computed by the database (claim_daily_checkin), never by the browser. */
export async function claimCheckin(): Promise<{ data?: ClaimResult; error?: string }> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('claim_daily_checkin')
  if (error) return { error: errorMessage(error) }
  revalidatePath('/', 'layout')
  return { data: data as ClaimResult }
}

export async function answerByte(response: Response): Promise<{ data?: ByteResult; error?: string }> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('answer_daily_byte', { p_response: response })
  if (error) return { error: errorMessage(error) }
  revalidatePath('/', 'layout')
  return { data: data as ByteResult }
}

export async function equipCosmetic(kind: 'title' | 'frame', code: string | null): Promise<{ error?: string }> {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('equip_cosmetic', { p_kind: kind, p_code: code })
  if (error) return { error: errorMessage(error) }
  revalidatePath('/', 'layout')
  return {}
}
