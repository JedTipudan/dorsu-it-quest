import { NextResponse } from 'next/server'
import { getSession, isStaffRole } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { csvCell } from '@/lib/utils'

/** Research export: anonymous student codes only (RA 10173 — no names or emails). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, profile } = await getSession()
  if (!supabase || !profile || !isStaffRole(profile.role)) return new NextResponse('Forbidden', { status: 403 })
  const limited = await rateLimit([{ parts: ['export', profile.id], limit: 30, windowSeconds: 600 }])
  if (limited) return new NextResponse(limited, { status: 429 })

  const { data: cls } = await supabase.from('classes').select('name, group_type').eq('id', id).maybeSingle()
  if (!cls) return new NextResponse('Not found', { status: 404 })
  const { data, error } = await supabase.rpc('class_roster', { p_class: id })
  if (error) return new NextResponse(error.message, { status: 400 })

  const header = ['student_code', 'group', 'year_level', 'xp', 'level', 'current_streak_days', 'quests_passed', 'avg_quest_percent', 'pretest_percent', 'posttest_percent', 'gain', 'sus_score', 'motivation_mean']
  const rows = (data ?? []).map((r: Record<string, number | string | null>) => [
    r.student_code, cls.group_type, r.year_level, r.xp, r.level, r.streak, r.quests_passed, r.avg_percent,
    r.pretest, r.posttest,
    r.pretest !== null && r.posttest !== null ? (Number(r.posttest) - Number(r.pretest)).toFixed(2) : '',
    r.sus_score, r.motivation_mean,
  ])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  const filename = `${cls.name.replace(/[^\w-]+/g, '_')}_research_data.csv`

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
