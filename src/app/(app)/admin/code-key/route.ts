import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { csvCell } from '@/lib/utils'

/**
 * Code–identity key (admin only). The study keeps "the code-identity key apart from the data"
 * (RA 10173): research exports use anonymous student codes, and only an admin can download
 * this separate file that maps each code back to a person. It should be stored apart from
 * the research CSVs, on a password-protected drive.
 */
export async function GET() {
  const { supabase, profile } = await getSession()
  if (!supabase || !profile || profile.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

  const { data, error } = await supabase.from('profiles')
    .select('student_code, full_name, display_name, email, year_level, section, created_at')
    .eq('role', 'student').order('student_code').limit(10000)
  if (error) return new NextResponse(error.message, { status: 400 })

  const header = ['student_code', 'full_name', 'display_name', 'email', 'year_level', 'section', 'registered_at']
  const rows = (data ?? []).map((r) => [r.student_code, r.full_name, r.display_name, r.email, r.year_level, r.section, r.created_at])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  const stamp = new Date().toISOString().slice(0, 10)

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="CONFIDENTIAL_code_identity_key_${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
