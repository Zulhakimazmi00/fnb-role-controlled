
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Job = {
  id: string
  job_number: string
  priority: string
  status: string
  category: string
  problem_description: string
  reported_at: string
  due_at: string | null
  actual_cost: number | null
  estimated_cost: number | null
  branches?: {
    branch_name: string
    branch_code: string
  } | null
}

function formatDate(date: string | null) {
  if (!date) return '-'

  return new Date(date).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function priorityClass(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-700'
    case 'HIGH':
      return 'bg-orange-100 text-orange-700'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-700'
    case 'LOW':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'COMPLETED':
    case 'CLOSED':
      return 'bg-green-100 text-green-700'
    case 'REPAIR':
    case 'SITE VISIT':
    case 'DIAGNOSIS':
      return 'bg-blue-100 text-blue-700'
    case 'ASSIGNED':
    case 'ACCEPTED':
      return 'bg-purple-100 text-purple-700'
    case 'UNDER REVIEW':
      return 'bg-yellow-100 text-yellow-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export default async function DashboardHome() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  const { data: jobs } = await supabase
    .from('maintenance_jobs')
    .select(
      'id, job_number, priority, status, category, problem_description, reported_at, due_at, actual_cost, estimated_cost, branches(branch_name, branch_code)'
    )
    .order('reported_at', { ascending: false })

  const allJobs: Job[] = (jobs ?? []).map((item) => ({
    ...item,
    branches: Array.isArray(item.branches)
      ? item.branches[0] ?? null
      : item.branches ?? null,
  })) as Job[]

  const openJobs = allJobs.filter(
    (job) =>
      !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(job.status)
  ).length

  const criticalJobs = allJobs.filter(
    (job) =>
      job.priority === 'CRITICAL' &&
      !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(job.status)
  ).length

  const inProgressJobs = allJobs.filter((job) =>
    ['SITE VISIT', 'DIAGNOSIS', 'REPAIR'].includes(job.status)
  ).length

  const completedJobs = allJobs.filter((job) =>
    ['COMPLETED', 'CLOSED'].includes(job.status)
  ).length

  const totalEstimatedCost = allJobs.reduce(
    (sum, job) => sum + Number(job.estimated_cost ?? 0),
    0
  )

  const totalActualCost = allJobs.reduce(
    (sum, job) => sum + Number(job.actual_cost ?? 0),
    0
  )

  const recentJobs = allJobs.slice(0, 8)

  const role = profile?.role ?? 'USER'
  const fullName = profile?.full_name ?? 'User'

  return (
    <div className="space-y-6">

      {/* Hero */}
      <section className="overflow-hidden rounded-3xl dunkin-gradient p-8 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
              Central Maintenance Control Tower
            </div>

            <h1 className="text-3xl font-black tracking-tight lg:text-4xl">
              Welcome back, {fullName}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90 lg:text-base">
              Monitor maintenance operations, contractors, assets and
              branch service activity from one central platform.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-5 backdrop-blur-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Current Role
            </div>

            <div className="mt-1 text-lg font-black">
              {role.replaceAll('_', ' ')}
            </div>

            <div className="mt-3 text-xs text-white/70">
              HQ Maintenance Management System
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#4a2633]">
              Maintenance Overview
            </h2>

            <p className="text-sm text-slate-500">
              Live operational summary
            </p>
          </div>

          <Link
            href="/jobs"
            className="text-sm font-bold text-[#e85d91] hover:underline"
          >
            View all jobs →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="dunkin-card p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">
              Open Jobs
            </div>

            <div className="mt-2 text-3xl font-black text-[#4a2633]">
              {openJobs}
            </div>

            <div className="mt-2 text-xs text-slate-400">
              Currently requiring action
            </div>
          </div>

          <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-red-600">
              Critical
            </div>

            <div className="mt-2 text-3xl font-black text-red-700">
              {criticalJobs}
            </div>

            <div className="mt-2 text-xs text-slate-400">
              Critical open jobs
            </div>
          </div>

          <div className="dunkin-card p-5 shadow-sm">
            <div className="text-sm font-semibold text-blue-600">
              In Progress
            </div>

            <div className="mt-2 text-3xl font-black text-blue-700">
              {inProgressJobs}
            </div>

            <div className="mt-2 text-xs text-slate-400">
              Site visit, diagnosis or repair
            </div>
          </div>

          <div className="dunkin-card p-5 shadow-sm">
            <div className="text-sm font-semibold text-green-600">
              Completed
            </div>

            <div className="mt-2 text-3xl font-black text-green-700">
              {completedJobs}
            </div>

            <div className="mt-2 text-xs text-slate-400">
              Completed or closed jobs
            </div>
          </div>

        </div>
      </section>

      {/* Quick Actions */}
      <section className="dunkin-card p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black text-[#4a2633]">
            Quick Actions
          </h2>

          <p className="text-sm text-slate-500">
            Frequently used maintenance functions
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <Link
            href="/jobs/new"
            className="rounded-xl bg-[#f582ae] p-4 text-white transition hover:bg-[#e85d91]"
          >
            <div className="text-lg font-black">
              + New Job
            </div>

            <div className="mt-1 text-xs text-white/80">
              Create maintenance request
            </div>
          </Link>

          <Link
            href="/jobs"
            className="rounded-xl border border-[#f3dce5] bg-white p-4 text-[#4a2633] transition hover:bg-[#fff1f6]"
          >
            <div className="text-lg font-black">
              Jobs Register
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Monitor maintenance jobs
            </div>
          </Link>

          <Link
            href="/assets"
            className="rounded-xl border border-[#f3dce5] bg-white p-4 text-[#4a2633] transition hover:bg-[#fff1f6]"
          >
            <div className="text-lg font-black">
              Asset Register
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Equipment and warranty
            </div>
          </Link>

          <Link
            href="/contractors"
            className="rounded-xl border border-[#f3dce5] bg-white p-4 text-[#4a2633] transition hover:bg-[#fff1f6]"
          >
            <div className="text-lg font-black">
              Contractors
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Contractor management
            </div>
          </Link>

        </div>
      </section>

      {/* Financial Snapshot */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="dunkin-card p-6">
          <div className="text-sm font-semibold text-slate-500">
            Estimated Maintenance Cost
          </div>

          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            RM {totalEstimatedCost.toLocaleString('en-MY', {
              minimumFractionDigits: 2,
            })}
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Based on current job estimates
          </p>
        </div>

        <div className="dunkin-card p-6">
          <div className="text-sm font-semibold text-slate-500">
            Actual Maintenance Cost
          </div>

          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            RM {totalActualCost.toLocaleString('en-MY', {
              minimumFractionDigits: 2,
            })}
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Recorded actual job costs
          </p>
        </div>

      </section>

      {/* Recent Jobs */}
      <section className="dunkin-card overflow-hidden">

        <div className="flex items-center justify-between border-b border-[#f3dce5] px-6 py-5">
          <div>
            <h2 className="text-xl font-black text-[#4a2633]">
              Recent Maintenance Activity
            </h2>

            <p className="text-sm text-slate-500">
              Latest maintenance jobs across the network
            </p>
          </div>

          <Link
            href="/jobs"
            className="text-sm font-bold text-[#e85d91] hover:underline"
          >
            View register →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#fff8fa] text-left">
              <tr>
                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Job
                </th>

                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Branch
                </th>

                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Category
                </th>

                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Priority
                </th>

                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Status
                </th>

                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Reported
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f3dce5]">

              {recentJobs.map((job) => (
                <tr
                  key={job.id}
                  className="transition hover:bg-[#fff8fa]"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-bold text-[#e85d91] hover:underline"
                    >
                      {job.job_number}
                    </Link>

                    <div className="mt-1 max-w-xs truncate text-xs text-slate-400">
                      {job.problem_description}
                    </div>
                  </td>

                  <td className="px-6 py-4 font-semibold text-[#4a2633]">
                    {job.branches?.branch_code ?? '-'}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {job.category}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClass(
                        job.priority
                      )}`}
                    >
                      {job.priority}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(job.reported_at)}
                  </td>
                </tr>
              ))}

              {recentJobs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No maintenance jobs recorded yet.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </section>

      {/* System Status */}
      <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-green-500" />

          <div>
            <div className="font-bold text-green-800">
              Maintenance Control Tower Online
            </div>

            <div className="text-xs text-green-700">
              Database connection active • Maintenance data synchronized
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

