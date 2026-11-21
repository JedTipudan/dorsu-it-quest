import { requireStaff } from '@/lib/auth'

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  await requireStaff()
  return children
}
