'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin, requireStaff } from '@/lib/auth'
import { questIssues, questionIssues, toDb } from '@/lib/forge'
import { rateLimit } from '@/lib/rate-limit'
import type { ActionState } from '@/lib/types'
import { errorMessage } from '@/lib/utils'

const uuid = z.string().uuid()

// ---------- Classes ----------
const classSchema = z.object({
  name: z.string().trim().min(2, 'Class name is required.').max(80),
  subject_id: uuid,
  group_type: z.enum(['experimental', 'control', 'none']),
  academic_year: z.string().trim().min(4).max(20),
})

export async function createClass(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireStaff()
  const parsed = classSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { data, error } = await supabase.from('classes').insert({ ...parsed.data, instructor_id: profile.id }).select('id').single()
  if (error) return { error: errorMessage(error) }
  revalidatePath('/instructor', 'layout')
  redirect(`/instructor/classes/${data.id}`)
}

export async function updateClass(classId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff()
  const parsed = classSchema.omit({ subject_id: true }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { error } = await supabase.from('classes').update(parsed.data).eq('id', classId)
  if (error) return { error: errorMessage(error) }
  revalidatePath(`/instructor/classes/${classId}`)
  return { ok: true, message: 'Class updated.' }
}

export async function deleteClass(classId: string) {
  const { supabase } = await requireStaff()
  await supabase.from('classes').delete().eq('id', classId)
  revalidatePath('/instructor', 'layout')
  redirect('/instructor/classes')
}

export async function regenerateJoinCode(classId: string) {
  const { supabase } = await requireStaff()
  const { error } = await supabase.rpc('regenerate_join_code', { p_class: classId })
  if (error) return { error: errorMessage(error) }
  revalidatePath(`/instructor/classes/${classId}`)
  return { ok: true }
}

export async function removeStudent(classId: string, studentId: string) {
  const { supabase } = await requireStaff()
  await supabase.from('class_members').delete().eq('class_id', classId).eq('student_id', studentId)
  revalidatePath(`/instructor/classes/${classId}`)
}

// ---------- Quests ----------
export async function setQuestPublished(questId: string, published: boolean) {
  const { supabase } = await requireStaff()
  const { error } = await supabase.from('quests').update({ is_published: published }).eq('id', questId)
  revalidatePath('/', 'layout')
  return error ? { error: errorMessage(error) } : { ok: true }
}

export async function deleteQuest(questId: string) {
  const { supabase } = await requireStaff()
  await supabase.from('quests').delete().eq('id', questId)
  revalidatePath('/', 'layout')
  redirect('/instructor/content')
}

// ---------- Quest Forge (whole quest saved in one go) ----------
const forgeOption = z.object({ id: z.string().min(1).max(40), text: z.string().max(500) })
const forgeQuestion = z.object({
  key: z.string().max(60),
  id: uuid.optional(),
  kind: z.enum(['mcq', 'truefalse', 'multi', 'short', 'order', 'code']),
  prompt: z.string().max(1000),
  code: z.string().max(4000),
  topic: z.string().max(60),
  difficulty: z.number().int().min(1).max(3),
  points: z.number().int().min(1).max(100),
  explanation: z.string().max(1500),
  options: z.array(forgeOption).max(10),
  correct: z.array(z.string().max(40)).max(10),
  accepted: z.array(z.string().max(200)).max(20),
})
const forgeBundle = z.object({
  quest: z.object({
    id: uuid.optional(),
    subject_id: uuid,
    title: z.string().trim().max(120),
    description: z.string().trim().max(500),
    type: z.enum(['quiz', 'simulation', 'challenge', 'pretest', 'posttest']),
    difficulty: z.number().int().min(1).max(3),
    xp_reward: z.number().int().min(0).max(1000),
    time_limit_seconds: z.number().int().min(30).max(7200).nullable(),
    is_published: z.boolean(),
  }),
  questions: z.array(forgeQuestion).max(100),
})

export type ForgeSaveResult = { ok: true; questId: string; ids: Record<string, string> } | { ok: false; error: string }

export async function saveQuestBundle(input: unknown): Promise<ForgeSaveResult> {
  const { supabase, profile } = await requireStaff()
  const limited = await rateLimit([{ parts: ['forge-save', profile.id], limit: 60, windowSeconds: 600 }])
  if (limited) return { ok: false, error: limited }
  const parsed = forgeBundle.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid quest data.' }
  const { quest, questions } = parsed.data

  // Same rules the editor shows live, enforced again on the server.
  const problems = questIssues(quest, questions)
  questions.forEach((q, i) => questionIssues(q).forEach((p) => problems.push(`Question ${i + 1}: ${p}`)))
  if (problems.length) return { ok: false, error: problems[0] }

  const { id: existingId, ...questRow } = quest
  let questId = existingId ?? ''
  if (questId) {
    const { error } = await supabase.from('quests').update(questRow).eq('id', questId)
    if (error) return { ok: false, error: errorMessage(error) }
  } else {
    const { data: last } = await supabase.from('quests').select('sort_order')
      .eq('subject_id', quest.subject_id).lt('sort_order', 100).order('sort_order', { ascending: false }).limit(1)
    const sort_order = (last?.[0]?.sort_order ?? 0) + 1
    const { data, error } = await supabase.from('quests').insert({ ...questRow, sort_order, created_by: profile.id }).select('id').single()
    if (error) return { ok: false, error: errorMessage(error) }
    questId = data.id
  }

  // Remove questions the author deleted in the editor.
  const keepIds = questions.map((q) => q.id).filter(Boolean) as string[]
  const { data: existing } = await supabase.from('questions').select('id').eq('quest_id', questId)
  const toDelete = (existing ?? []).map((r) => r.id as string).filter((id) => !keepIds.includes(id))
  if (toDelete.length) {
    const { error } = await supabase.from('questions').delete().in('id', toDelete)
    if (error) return { ok: false, error: errorMessage(error) }
  }

  const ids: Record<string, string> = {}
  for (const [i, q] of questions.entries()) {
    const { options, answer } = toDb(q)
    const row = {
      quest_id: questId, kind: q.kind, prompt: q.prompt.trim(),
      code: q.code.trim() ? q.code.replace(/\s+$/, '') : null,
      topic: q.topic.trim() || null, difficulty: q.difficulty, points: q.points, sort_order: i + 1, options,
    }
    let qid = q.id ?? ''
    if (qid) {
      const { error } = await supabase.from('questions').update(row).eq('id', qid)
      if (error) return { ok: false, error: `Question ${i + 1}: ${errorMessage(error)}` }
    } else {
      const { data, error } = await supabase.from('questions').insert(row).select('id').single()
      if (error) return { ok: false, error: `Question ${i + 1}: ${errorMessage(error)}` }
      qid = data.id
    }
    ids[q.key] = qid
    const { error: keyError } = await supabase.from('question_keys')
      .upsert({ question_id: qid, answer, explanation: q.explanation.trim() }, { onConflict: 'question_id' })
    if (keyError) return { ok: false, error: `Question ${i + 1}: ${errorMessage(keyError)}` }
  }

  revalidatePath('/', 'layout')
  return { ok: true, questId, ids }
}

// ---------- Admin ----------
export async function setUserRole(userId: string, role: 'student' | 'instructor' | 'admin') {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.rpc('set_user_role', { p_user: userId, p_role: role })
  revalidatePath('/admin/users')
  return error ? { error: errorMessage(error) } : { ok: true }
}

export async function deleteFeedback(id: string) {
  const { supabase } = await requireAdmin()
  await supabase.from('feedback').delete().eq('id', id)
  revalidatePath('/instructor/feedback')
}

// ---------- Announcements (mission briefings) ----------
const announcementSchema = z.object({
  class_id: z.string().optional(),
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(100),
  body: z.string().trim().max(1000).default(''),
  tone: z.enum(['info', 'event', 'urgent']).default('info'),
  pinned: z.string().optional(),
  expires_days: z.coerce.number().int().min(0).max(90).default(0),
})

export async function createAnnouncement(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireStaff()
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { class_id, pinned, expires_days, ...rest } = parsed.data
  const target = class_id && class_id !== 'all' ? class_id : null
  if (!target && profile.role !== 'admin') return { error: 'Choose one of your classes. Only admins can post to everyone.' }
  const { error } = await supabase.from('announcements').insert({
    ...rest,
    author_id: profile.id,
    class_id: target,
    pinned: pinned === 'on',
    expires_at: expires_days > 0 ? new Date(Date.now() + expires_days * 86_400_000).toISOString() : null,
  })
  if (error) return { error: errorMessage(error) }
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Briefing posted. Students see it on their dashboard.' }
}

export async function deleteAnnouncement(id: string) {
  const { supabase } = await requireStaff()
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  revalidatePath('/', 'layout')
  return error ? { error: errorMessage(error) } : { ok: true }
}

// ---------- Expert validation rubric ----------
const score = z.coerce.number().int().min(1).max(5)
const reviewSchema = z.object({
  accuracy: score, alignment: score, difficulty_fit: score, technical: score,
  comment: z.string().trim().max(1000).default(''),
})

export async function saveQuestReview(questId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireStaff()
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Rate every criterion from 1 to 5.' }
  const { error } = await supabase.from('quest_reviews').upsert(
    { quest_id: questId, reviewer_id: profile.id, ...parsed.data, updated_at: new Date().toISOString() },
    { onConflict: 'quest_id,reviewer_id' },
  )
  if (error) return { error: errorMessage(error) }
  revalidatePath(`/instructor/content/quests/${questId}`)
  revalidatePath('/instructor/content')
  return { ok: true, message: 'Validation saved.' }
}
