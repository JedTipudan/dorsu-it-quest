import type { Metadata } from 'next'
import { Search, Users } from 'lucide-react'
import { Alert, PageHeader, Pill, StatCard } from '@/components/ui/misc'
import { requireAdmin } from '@/lib/auth'
import { levelForXp } from '@/lib/gamification'
import type { Profile } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { RoleSelect } from './role-select'

export const metadata: Metadata = { title: 'Users & roles' }

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const { q, role } = await searchParams
  const { supabase, profile: me } = await requireAdmin()

  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200)
  const term = (q ?? '').trim().replace(/[%,()]/g, '')
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,student_code.ilike.%${term}%,display_name.ilike.%${term}%`)
  if (role === 'student' || role === 'instructor' || role === 'admin') query = query.eq('role', role)
  const [{ data }, { count: total }, { count: staff }] = await Promise.all([
    query,
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['instructor', 'admin']),
  ])
  const users = (data ?? []) as Profile[]

  return (
    <>
      <PageHeader title="Users & roles" description="Promote faculty accounts to Instructor so they can create classes, author content and view analytics." icon={Users} />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total users" value={total ?? 0} icon={Users} />
        <StatCard label="Staff" value={staff ?? 0} icon={Users} tone="violet" />
      </section>
      <form className="card mb-4 flex flex-col gap-2 p-3 sm:flex-row" role="search">
        <label htmlFor="q" className="sr-only">Search users</label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="q" name="q" defaultValue={q} placeholder="Search name, email or student code" className="h-11 w-full rounded-xl border-2 border-indigo-100 pr-3 pl-9" />
        </div>
        <label htmlFor="role" className="sr-only">Role</label>
        <select id="role" name="role" defaultValue={role ?? ''} className="h-11 rounded-xl border-2 border-indigo-100 bg-panel px-3">
          <option value="">All roles</option><option value="student">Students</option><option value="instructor">Instructors</option><option value="admin">Admins</option>
        </select>
        <button type="submit" className="h-11 rounded-xl bg-indigo-600 px-5 font-semibold text-white">Search</button>
      </form>
      {users.length === 200 && <Alert tone="info" className="mb-4">Showing the 200 most recent matches — refine your search to narrow it down.</Alert>}
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>User</th><th>Code</th><th>Year / Section</th><th className="text-right">Level</th><th>Joined</th><th>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><p className="font-semibold">{u.full_name || u.display_name}{u.id === me.id && <Pill tone="indigo" className="ml-2">You</Pill>}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                <td className="font-mono text-xs">{u.student_code}</td>
                <td>{u.year_level ? `Year ${u.year_level}` : '—'}{u.section ? ` · ${u.section}` : ''}</td>
                <td className="text-right">{levelForXp(u.xp)}</td>
                <td className="whitespace-nowrap">{formatDate(u.created_at)}</td>
                <td><RoleSelect userId={u.id} role={u.role} disabled={u.id === me.id} /></td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
