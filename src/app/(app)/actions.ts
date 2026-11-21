'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { ActionState, AttemptResult, Question, Response } from '@/lib/types'
import { errorMessage } from '@/lib/utils'

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string }

const responsesSchema = z.record(
  z.string().uuid(),
  z.object({
    value: z.string().max(500).optional(),
    values: z.array(z.string().max(100)).max(20).optional(),
    order: z.array(z.string().max(100)).max(20).optional(),
  }),
)

export async function submitQuestAttempt(questId: string, responses: Record<string, Response>, durationSeconds: number): Promise<Result<AttemptResult>> {
  const parsed = responsesSchema.safeParse(responses)
  if (!parsed.success || !z.string().uuid().safeParse(questId).success) return { error: 'Invalid submission.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_quest_attempt', {
    p_quest_id: questId,
    p_responses: parsed.data,
    p_duration: Math.max(0, Math.round(durationSeconds)),
  })
  if (error) return { error: errorMessage(error) }
  revalidatePath('/', 'layout')
  return { data: data as AttemptResult }
}

export interface ChallengeStart {
  session_id: string
  target_difficulty: number
  mastery: number
  time_limit_seconds: number
  questions: Question[]
}

export async function startChallenge(subjectId: string | null): Promise<Result<ChallengeStart>> {
  if (subjectId && !z.string().uuid().safeParse(subjectId).success) return { error: 'Invalid subject.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('start_challenge', { p_subject_id: subjectId, p_count: 10 })
  if (error) return { error: errorMessage(error) }
  return { data: data as ChallengeStart }
}

export async function submitChallenge(sessionId: string, responses: Record<string, Response>, durationSeconds: number): Promise<Result<AttemptResult>> {
  const parsed = responsesSchema.safeParse(responses)
  if (!parsed.success || !z.string().uuid().safeParse(sessionId).success) return { error: 'Invalid submission.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_challenge', {
    p_session_id: sessionId,
    p_responses: parsed.data,
    p_duration: Math.max(0, Math.round(durationSeconds)),
  })
  if (error) return { error: errorMessage(error) }
  revalidatePath('/', 'layout')
  return { data: data as AttemptResult }
}

export interface SubnetCheck {
  correct: boolean
  xp_earned: number
  new_badges: AttemptResult['new_badges']
  expected: { network: string; broadcast: string; first: string; last: string; hosts: number; mask: string }
  fields: Record<'network' | 'broadcast' | 'first' | 'last' | 'hosts', boolean>
}

export async function checkSubnet(input: {
  ip: string; prefix: number; network: string; broadcast: string; first: string; last: string; hosts: string
}): Promise<Result<SubnetCheck>> {
  const supabase = await createClient()
  const hosts = Number.parseInt(input.hosts, 10)
  const { data, error } = await supabase.rpc('check_subnet', {
    p_ip: input.ip,
    p_prefix: input.prefix,
    p_network: input.network.slice(0, 40),
    p_broadcast: input.broadcast.slice(0, 40),
    p_first: input.first.slice(0, 40),
    p_last: input.last.slice(0, 40),
    p_hosts: Number.isFinite(hosts) ? hosts : -1,
  })
  if (error) return { error: errorMessage(error) }
  revalidatePath('/', 'layout')
  return { data: data as SubnetCheck }
}

// ---------- Profile ----------
const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name.').max(120),
  display_name: z.string().trim().min(2, 'Display name must be at least 2 characters.').max(40),
  year_level: z.enum(['1', '2', '3', '4']).optional().or(z.literal('')),
  section: z.string().trim().max(30).optional(),
  show_on_leaderboard: z.string().optional(),
})

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.' }
  const d = parsed.data
  const { error } = await supabase.from('profiles').update({
    full_name: d.full_name,
    display_name: d.display_name,
    year_level: d.year_level ? Number(d.year_level) : null,
    section: d.section || null,
    show_on_leaderboard: d.show_on_leaderboard === 'on',
  }).eq('id', user.id)
  if (error) return { error: errorMessage(error) }
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Profile saved.' }
}

export async function joinClass(_: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get('code') ?? '').trim()
  if (!/^[A-Za-z0-9]{6}$/.test(code)) return { error: 'Class codes are 6 letters/numbers.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('join_class', { p_code: code })
  if (error) return { error: errorMessage(error) }
  // Wrong codes come back as { error } (not an exception) so the database can count guesses.
  const result = data as { name?: string; error?: string }
  if (result?.error) return { error: result.error }
  revalidatePath('/profile')
  revalidatePath('/leaderboard')
  return { ok: true, message: `You joined ${result.name}!` }
}

export async function leaveClass(classId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('class_members').delete().eq('class_id', classId).eq('student_id', user.id)
  revalidatePath('/profile')
}

// ---------- Research instruments ----------
export async function submitSurvey(instrument: 'sus' | 'motivation', answers: number[]): Promise<Result<{ score: number }>> {
  const expected = instrument === 'sus' ? 10 : 12
  if (answers.length !== expected || answers.some((a) => !Number.isInteger(a) || a < 1 || a > 5)) {
    return { error: 'Please answer every item.' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.' }
  const { data, error } = await supabase
    .from('survey_responses')
    .upsert({ user_id: user.id, instrument, answers }, { onConflict: 'user_id,instrument' })
    .select('score')
    .single()
  if (error) return { error: errorMessage(error) }
  revalidatePath('/surveys')
  return { data: { score: Number(data.score) } }
}

const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Choose a rating.').max(5),
  category: z.enum(['general', 'content', 'usability', 'bug', 'feature']),
  message: z.string().trim().min(3, 'Tell us a bit more (at least 3 characters).').max(2000),
})

export async function submitFeedback(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.' }
  const { error } = await supabase.from('feedback').insert({ user_id: user.id, ...parsed.data })
  if (error) return { error: errorMessage(error) }
  revalidatePath('/feedback')
  return { ok: true, message: 'Thank you! Your feedback helps improve DOrSU IT Quest.' }
}
