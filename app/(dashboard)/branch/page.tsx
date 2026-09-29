'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Job = {
  id: string
  job_number: string
  category: string
  priority: string
  status: string
  problem_description: string
  reported_by: string | null
  reported_at: string
  due_at: string | null
  completed_at: string | null
  branch_id: string
}

type Branch = {
  id: string
  branch_code: string
  branch_name: string
}

export default function BranchDashboardPage() {
  const supabase = createClient()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Your session has expired. Please log in again.')
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('branch_id, role, is_active')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        throw new Error(profileError.message)
      }

      if (!profile) {
        throw new Error('Your user profile could not be found.')
      }

      if (profile.role !== 'BRANCH_USER') {
        throw new Error(
          'This dashboard is only available to Branch Users.'
        )
      }

      if (!profile.is_active) {
        throw new Error('Your account is inactive.')
      }

      if (!profile.branch_id) {
        throw new Error(
          'Your account has not been assigned to a branch.'
        )
      }

      const [{ data: branchData, error: branchError }, { data: jobData, error: jobError }] =
        await Promise.all([
          supabase
            .from('branches')
            .select('id, branch_code, branch_name')
            .eq('id', profile.branch_id)
            .maybeSingle(),

          supabase
            .from('maintenance_jobs')
            .select(
              'id, job_number, category, priority, status, problem_description, reported_by, reported_at, due_at, completed_at, branch_id'
            )
            .eq('branch_id', profile.branch_id)
            .order('reported_at', { ascending: false }),
        ])

      if (branchError) {
        throw new Error(branchError.message)
      }

      if (jobError) {
        throw new Error(jobError.message)
      }

      setBranch(branchData)
      setJobs(jobData || [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load branch dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const open = jobs.filter(
      (job) =>
        !['COMPLETED', 'BRANCH VERIFICATION', 'CLOSED', 'CANCELLED'].includes(
          job.status
        )
    ).length

    const critical = jobs.filter(
      (job) =>
        job.priority === 'CRITICAL' &&
        !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(job.status)
    ).length

    const inProgress = jobs.filter((job) =>
      ['ASSIGNED', 'ACCEPTED', 'SITE VISIT', 'DIAGNOSIS', 'REPAIR'].includes(
        job.status
      )
    ).length

    const awaitingVerification = jobs.filter(
      (job) => job.status === 'BRANCH VERIFICATION'
    ).length

    return {
      total: jobs.length,
      open,
      critical,
      inProgress,
      awaitingVerification,
    }
  }, [jobs])

  function formatDate(value: string | null) {
    if (!value) return '-'

    return new Date(value).toLocaleString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function statusClass(status: string) {
    switch (status) {
      case 'NEW':
        return 'bg-slate-100 text-slate-700'

      case 'UNDER REVIEW':
        return 'bg-blue-100 text-blue-700'

      case 'ASSIGNED':
      case 'ACCEPTED':
        return 'bg-purple-100 text-purple-700'

      case 'SITE VISIT':
      case 'DIAGNOSIS':
      case 'REPAIR':
        return 'bg-orange-100 text-orange-700'

      case 'COMPLETED':
        return 'bg-green-100 text-green-700'

      case 'BRANCH VERIFICATION':
        return 'bg-pink-100 text-pink-700'

      case 'CLOSED':
        return 'bg-emerald-100 text-emerald-700'

      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-100 text-red-700'

      default:
        return 'bg-slate-100 text-slate-700'
    }
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
        return 'bg-slate-100 text-slate-700'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#f3dce5] border-t-[#f582ae]" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading branch dashboard...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-xl text-red-600">
          !
        </div>

        <h1 className="mt-5 text-2xl font-black text-[#4a2633]">
          Unable to Load Dashboard
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {error}
        </p>

        <button
          onClick={loadDashboard}
          className="mt-6 rounded-xl bg-[#f582ae] px-5 py-3 text-sm font-bold text-white hover:bg-[#e85d91]"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl dunkin-gradient text-xl font-black text-white shadow-sm">
              D
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f582ae]">
                Branch Portal
              </p>

              <h1 className="text-3xl font-black text-[#4a2633]">
                {branch?.branch_name || 'Branch'}
              </h1>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Maintenance requests and service status for your branch.
          </p>
        </div>

        <Link
          href="/branch/jobs/new"
          className="inline-flex items-center justify-center rounded-xl bg-[#f582ae] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#e85d91]"
        >
          + Report New Issue
        </Link>
      </div>

      {/* Branch information */}
      <div className="dunkin-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Branch
          </p>

          <p className="mt-1 text-lg font-black text-[#4a2633]">
            {branch?.branch_code} — {branch?.branch_name}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-green-700">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          Branch account active
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total Jobs
          </p>
          <p className="mt-2 text-3xl font-black text-[#4a2633]">
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            All branch requests
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Open Jobs
          </p>
          <p className="mt-2 text-3xl font-black text-orange-600">
            {stats.open}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Currently active
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Critical
          </p>
          <p className="mt-2 text-3xl font-black text-red-600">
            {stats.critical}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Critical open issues
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            In Progress
          </p>
          <p className="mt-2 text-3xl font-black text-purple-600">
            {stats.inProgress}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Contractor / HQ action
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Verification
          </p>
          <p className="mt-2 text-3xl font-black text-[#f582ae]">
            {stats.awaitingVerification}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Awaiting branch confirmation
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/branch/jobs/new"
          className="group rounded-2xl border border-[#f3dce5] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-xl">
            +
          </div>

          <h2 className="mt-4 text-lg font-black text-[#4a2633]">
            Report New Issue
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Submit a new maintenance request to HQ.
          </p>
        </Link>

        <Link
          href="/branch/jobs"
          className="group rounded-2xl border border-[#f3dce5] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-xl">
            ≡
          </div>

          <h2 className="mt-4 text-lg font-black text-[#4a2633]">
            View Maintenance Jobs
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track all maintenance requests for this branch.
          </p>
        </Link>

        <Link
          href="/branch/assets"
          className="group rounded-2xl border border-[#f3dce5] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-xl">
            ▣
          </div>

          <h2 className="mt-4 text-lg font-black text-[#4a2633]">
            Branch Assets
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            View equipment and assets assigned to this branch.
          </p>
        </Link>
      </div>

      {/* Recent jobs */}
      <div className="dunkin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#f3dce5] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#4a2633]">
              Recent Maintenance Requests
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest maintenance activity from your branch.
            </p>
          </div>

          <Link
            href="/branch/jobs"
            className="text-sm font-bold text-[#e85d91] hover:underline"
          >
            View All →
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-2xl">
              ✓
            </div>

            <h3 className="mt-4 text-lg font-black text-[#4a2633]">
              No Maintenance Jobs
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Your branch has not submitted any maintenance requests yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#fff8fa]">
                <tr className="border-b border-[#f3dce5]">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Job
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Category
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Priority
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Reported
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {jobs.slice(0, 10).map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-[#f3dce5] last:border-0 hover:bg-[#fff8fa]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#4a2633]">
                        {job.job_number}
                      </p>

                      <p className="mt-1 max-w-[320px] truncate text-xs text-slate-500">
                        {job.problem_description}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-600">
                      {job.category}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClass(
                          job.priority
                        )}`}
                      >
                        {job.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(job.reported_at)}
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/branch/jobs/${job.id}`}
                        className="text-sm font-bold text-[#e85d91] hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}