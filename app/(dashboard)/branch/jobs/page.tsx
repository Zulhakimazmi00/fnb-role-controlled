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
  contractor_id: string | null
  contractors:
    | {
        company_name: string
        contractor_code: string
      }
    | null
}

type Branch = {
  id: string
  branch_code: string
  branch_name: string
}

export default function BranchJobsPage() {
  const supabase = createClient()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('ALL')
  const [status, setStatus] = useState('ALL')

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
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
          'This page is only available to Branch Users.'
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
              'id, job_number, category, priority, status, problem_description, reported_by, reported_at, due_at, completed_at, contractor_id, contractors(company_name, contractor_code)'
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
      const normalizedJobs: Job[] = (jobData ?? []).map((item) => ({
        ...item,
        contractors: Array.isArray(item.contractors)
          ? item.contractors[0] ?? null
          : item.contractors ?? null,
      })) as Job[]
      setJobs(normalizedJobs)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load maintenance jobs.'
      )
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase()

    return jobs.filter((job) => {
      const matchesSearch =
        !query ||
        job.job_number.toLowerCase().includes(query) ||
        job.problem_description.toLowerCase().includes(query) ||
        job.category.toLowerCase().includes(query) ||
        (job.contractors?.company_name || '')
          .toLowerCase()
          .includes(query)

      const matchesPriority =
        priority === 'ALL' || job.priority === priority

      const matchesStatus =
        status === 'ALL' || job.status === status

      return matchesSearch && matchesPriority && matchesStatus
    })
  }, [jobs, search, priority, status])

  const stats = useMemo(() => {
    const open = jobs.filter(
      (job) =>
        ![
          'COMPLETED',
          'BRANCH VERIFICATION',
          'CLOSED',
          'CANCELLED',
        ].includes(job.status)
    ).length

    const critical = jobs.filter(
      (job) =>
        job.priority === 'CRITICAL' &&
        !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(job.status)
    ).length

    const verification = jobs.filter(
      (job) => job.status === 'BRANCH VERIFICATION'
    ).length

    const completed = jobs.filter(
      (job) =>
        job.status === 'COMPLETED' ||
        job.status === 'CLOSED'
    ).length

    return {
      total: jobs.length,
      open,
      critical,
      verification,
      completed,
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

  function isOverdue(job: Job) {
    if (!job.due_at) return false

    if (
      ['COMPLETED', 'BRANCH VERIFICATION', 'CLOSED', 'CANCELLED'].includes(
        job.status
      )
    ) {
      return false
    }

    return new Date(job.due_at).getTime() < Date.now()
  }

  function priorityClass(value: string) {
    switch (value) {
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

  function statusClass(value: string) {
    switch (value) {
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

  function resetFilters() {
    setSearch('')
    setPriority('ALL')
    setStatus('ALL')
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#f3dce5] border-t-[#f582ae]" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading maintenance jobs...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-black text-red-700">
          Unable to Load Jobs
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {error}
        </p>

        <button
          onClick={loadJobs}
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/branch"
            className="text-sm font-bold text-[#e85d91] hover:underline"
          >
            ← Branch Dashboard
          </Link>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#f582ae]">
            Branch Maintenance
          </p>

          <h1 className="mt-1 text-3xl font-black text-[#4a2633]">
            Maintenance Jobs
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {branch?.branch_code} — {branch?.branch_name}
          </p>
        </div>

        <Link
          href="/branch/jobs/new"
          className="inline-flex items-center justify-center rounded-xl bg-[#f582ae] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#e85d91]"
        >
          + Report New Issue
        </Link>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total
          </p>
          <p className="mt-2 text-3xl font-black text-[#4a2633]">
            {stats.total}
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Open
          </p>
          <p className="mt-2 text-3xl font-black text-orange-600">
            {stats.open}
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Critical
          </p>
          <p className="mt-2 text-3xl font-black text-red-600">
            {stats.critical}
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Verification
          </p>
          <p className="mt-2 text-3xl font-black text-[#f582ae]">
            {stats.verification}
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Completed
          </p>
          <p className="mt-2 text-3xl font-black text-green-600">
            {stats.completed}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="dunkin-card p-5">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_auto]">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Search
            </label>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Job number, problem, category, contractor..."
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#f582ae] focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Priority
            </label>

            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Status
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="UNDER REVIEW">Under Review</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="SITE VISIT">Site Visit</option>
              <option value="DIAGNOSIS">Diagnosis</option>
              <option value="REPAIR">Repair</option>
              <option value="COMPLETED">Completed</option>
              <option value="BRANCH VERIFICATION">
                Branch Verification
              </option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm font-bold text-[#4a2633] hover:bg-[#fff8fa]"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs font-medium text-slate-400">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </div>
      </div>

      {/* Job table */}
      <div className="dunkin-card overflow-hidden">
        <div className="border-b border-[#f3dce5] p-5">
          <h2 className="text-lg font-black text-[#4a2633]">
            Job Register
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Maintenance requests submitted by this branch.
          </p>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-2xl">
              ✓
            </div>

            <h3 className="mt-4 text-lg font-black text-[#4a2633]">
              No Jobs Found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              No maintenance jobs match your current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
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
                    Contractor
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Due
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
                {filteredJobs.map((job) => {
                  const overdue = isOverdue(job)

                  return (
                    <tr
                      key={job.id}
                      className="border-b border-[#f3dce5] last:border-0 hover:bg-[#fff8fa]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#4a2633]">
                          {job.job_number}
                        </p>

                        <p className="mt-1 max-w-[300px] truncate text-xs text-slate-500">
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

                        {job.status === 'BRANCH VERIFICATION' && (
                          <p className="mt-2 text-xs font-bold text-[#e85d91]">
                            Action required
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {job.contractors ? (
                          <>
                            <p className="text-sm font-bold text-[#4a2633]">
                              {job.contractors.company_name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {job.contractors.contractor_code}
                            </p>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Not assigned
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p
                          className={`text-sm font-medium ${
                            overdue
                              ? 'font-bold text-red-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {formatDate(job.due_at)}
                        </p>

                        {overdue && (
                          <p className="mt-1 text-xs font-bold text-red-600">
                            OVERDUE
                          </p>
                        )}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}