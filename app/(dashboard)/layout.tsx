import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TopNavigation from '@/components/TopNavigation'
import { isValidRole } from '@/lib/auth/roles'

type Role =
  | 'MANAGEMENT'
  | 'HQ_ADMIN'
  | 'HQ_MAINTENANCE'
  | 'FINANCE'
  | 'CONTRACTOR'
  | 'BRANCH_USER'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#fff8fa] p-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-black text-red-700">
            Profile Not Found
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Your authenticated account does not have a profile record.
          </p>
        </div>
      </div>
    )
  }

  if (!profile.is_active || !isValidRole(profile.role)) {
    redirect('/unauthorized')
  }

  const role = profile.role as Role

  return (
    <div className="min-h-screen bg-[#fff8fa]">
      <TopNavigation
        role={role}
        fullName={profile.full_name}
        email={profile.email || user.email || ''}
      />

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {children}
      </main>
    </div>
  )
}

