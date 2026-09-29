
'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setError('')

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Login failed. User account was not found.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .maybeSingle()

    if (profileError) {
      setError(
        `Unable to load user profile: ${profileError.message}`
      )
      setLoading(false)
      return
    }

    if (!profile) {
      setError(
        'User profile not found. Please contact the system administrator.'
      )
      setLoading(false)
      return
    }

    if (!profile.is_active) {
      await supabase.auth.signOut()
      setError(
        'This account is inactive. Please contact the system administrator.'
      )
      setLoading(false)
      return
    }

    switch (profile.role) {
      case 'CONTRACTOR':
        router.push('/contractor/jobs')
        break

      case 'BRANCH_USER':
        router.push('/branch/jobs')
        break

      case 'HQ_MAINTENANCE':
        router.push('/jobs')
        break

      case 'MANAGEMENT':
        router.push('/jobs')
        break

      case 'FINANCE':
        router.push('/finance/quotations')
        break

      case 'HQ_ADMIN':
        router.push('/')
        break

      default:
        setError(
          'Your account has an invalid system role. Please contact the system administrator.'
        )
        setLoading(false)
        return
    }

    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#fff8fa]">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="dunkin-card overflow-hidden shadow-xl">
            <div className="dunkin-gradient px-8 py-10 text-center">
              <div className="text-3xl font-black tracking-tight text-white">
                DUNKIN&apos;
              </div>

              <div className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-white/90">
                Maintenance
              </div>

              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                HQ Control Tower
              </div>
            </div>

            <div className="px-8 py-8">
              <h1 className="dunkin-heading text-2xl font-black">
                Sign In
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Access the Dunkin&apos; Maintenance Management System.
              </p>

              <form
                onSubmit={handleLogin}
                className="mt-8 space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none transition focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none transition focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="dunkin-primary w-full rounded-xl px-4 py-3 font-black transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-8 border-t border-[#f3dce5] pt-5 text-center text-xs text-slate-400">
                Dunkin&apos; Maintenance Management System
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

