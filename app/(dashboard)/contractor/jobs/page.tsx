'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Job = {
  id: string
  job_number: string
  category: string
  priority: string
  status: string
  problem_description: string
  due_at: string | null
  reported_at: string
  branches:
    | {
        branch_name: string
        branch_code: string
      }
    | null
}

const supabase = createClient()

const statuses = [
  'ALL',
  'ASSIGNED',
  'ACCEPTED',
  'SITE VISIT',
  'DIAGNOSIS',
  'QUOTATION SUBMITTED',
  'APPROVED',
  'REPAIR',
  'COMPLETED',
  'BRANCH VERIFICATION',
  'CLOSED',
]

const priorities = [
  'ALL',
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
]

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

function statusClass(status: string) {
  switch (status) {
    case 'ASSIGNED':
      return 'bg-purple-100 text-purple-700'
    case 'ACCEPTED':
      return 'bg-indigo-100 text-indigo-700'
    case 'SITE VISIT':
      return 'bg-cyan-100 text-cyan-700'
    case 'DIAGNOSIS':
      return 'bg-yellow-100 text-yellow-700'
    case 'QUOTATION SUBMITTED':
      return 'bg-orange-100 text-orange-700'
    case 'APPROVED':
      return 'bg-green-100 text-green-700'
    case 'REPAIR':
      return 'bg-pink-100 text-pink-700'
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700'
    case 'BRANCH VERIFICATION':
      return 'bg-violet-100 text-violet-700'
    case 'CLOSED':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function isOverdue(
  dueAt: string | null,
  status: string
) {
  if (!dueAt) return false

  if (
    status === 'COMPLETED' ||
    status === 'BRANCH VERIFICATION' ||
    status === 'CLOSED'
  ) {
    return false
  }

  return new Date(dueAt).getTime() < Date.now()
}

export default function ContractorJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadJobs() {
      setLoading(true)
      setError('')

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('You are not authenticated.')
        }

        const { data: profile, error: profileError } =
          await supabase
            .from('profiles')
            .select(
              'id, role, contractor_id, is_active'
            )
            .eq('id', user.id)
            .maybeSingle()

        if (profileError) {
          throw new Error(profileError.message)
        }

        if (!profile) {
          throw new Error(
            'Your user profile could not be found.'
          )
        }

        if (profile.role !== 'CONTRACTOR') {
          throw new Error(
            'This page is only available to contractor users.'
          )
        }

        if (!profile.is_active) {
          throw new Error(
            'Your contractor account is inactive.'
          )
        }

        if (!profile.contractor_id) {
          throw new Error(
            'Your account is not linked to a contractor company.'
          )
        }

        const { data, error: jobsError } =
          await supabase
            .from('maintenance_jobs')
            .select(
              'id, job_number, category, priority, status, problem_description, due_at, reported_at, branches(branch_name, branch_code)'
            )
            .eq(
              'contractor_id',
              profile.contractor_id
            )
            .order('reported_at', {
              ascending: false,
            })

        if (jobsError) {
          throw new Error(jobsError.message)
        }

        const normalizedJobs: Job[] = (data ?? []).map((item) => ({
          ...item,
          branches: Array.isArray(item.branches)
            ? item.branches[0] ?? null
            : item.branches ?? null,
        })) as Job[]

        setJobs(normalizedJobs)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load assigned jobs.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadJobs()
  }, [])

  const filteredJobs = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return jobs.filter((job) => {
      const matchesSearch =
        !searchText ||
        job.job_number
          .toLowerCase()
          .includes(searchText) ||
        job.problem_description
          .toLowerCase()
          .includes(searchText) ||
        job.category
          .toLowerCase()
          .includes(searchText) ||
        job.branches?.branch_name
          ?.toLowerCase()
          .includes(searchText) ||
        job.branches?.branch_code
          ?.toLowerCase()
          .includes(searchText)

      const matchesPriority =
        priority === 'ALL' ||
        job.priority === priority

      const matchesStatus =
        status === 'ALL' ||
        job.status === status

      return (
        matchesSearch &&
        matchesPriority &&
        matchesStatus
      )
    })
  }, [jobs, search, priority, status])

  const totalJobs = filteredJobs.length

  const awaitingAcceptance = filteredJobs.filter(
    (job) => job.status === 'ASSIGNED'
  ).length

  const activeJobs = filteredJobs.filter(
    (job) =>
      [
        'ACCEPTED',
        'SITE VISIT',
        'DIAGNOSIS',
        'QUOTATION SUBMITTED',
        'APPROVED',
        'REPAIR',
      ].includes(job.status)
  ).length

  const completedJobs = filteredJobs.filter(
    (job) =>
      [
        'COMPLETED',
        'BRANCH VERIFICATION',
        'CLOSED',
      ].includes(job.status)
  ).length

  const criticalJobs = filteredJobs.filter(
    (job) => job.priority === 'CRITICAL'
  ).length

  const overdueJobs = filteredJobs.filter((job) =>
    isOverdue(job.due_at, job.status)
  ).length

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#f3dce5] border-t-[#f582ae]" />

          <p className="mt-4 text-sm text-slate-500">
            Loading assigned jobs...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-black text-red-700">
          Contractor Jobs Error
        </h1>

        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#f582ae]">
            Contractor Portal
          </div>

          <h1 className="mt-1 text-3xl font-black text-[#4a2633]">
            Assigned Maintenance Jobs
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View and manage maintenance jobs assigned by
            Dunkin&apos; HQ.
          </p>
        </div>

        <Link
          href="/contractor"
          className="inline-flex items-center justify-center rounded-xl border border-[#f3dce5] bg-white px-5 py-3 text-sm font-black text-[#4a2633] hover:bg-[#fff8fa]"
        >
          ← Contractor Dashboard
        </Link>
      </div>

      {/* KPI */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total
          </div>
          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            {totalJobs}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Awaiting Acceptance
          </div>
          <div className="mt-2 text-3xl font-black text-purple-600">
            {awaitingAcceptance}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active
          </div>
          <div className="mt-2 text-3xl font-black text-cyan-600">
            {activeJobs}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Completed
          </div>
          <div className="mt-2 text-3xl font-black text-emerald-600">
            {completedJobs}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Critical
          </div>
          <div className="mt-2 text-3xl font-black text-red-600">
            {criticalJobs}
          </div>
        </div>

        <div className="dunkin-card border-red-200 p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-red-500">
            Overdue
          </div>
          <div className="mt-2 text-3xl font-black text-red-600">
            {overdueJobs}
          </div>
        </div>
      </div>

      {/* Filters */}

      <div className="dunkin-card p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_240px_auto]">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
              Search
            </label>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Job number, branch, category or problem..."
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
              Priority
            </label>

            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {item === 'ALL'
                    ? 'All Priorities'
                    : item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
              Status
            </label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === 'ALL'
                    ? 'All Statuses'
                    : item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setPriority('ALL')
                setStatus('ALL')
              }}
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-5 py-3 text-sm font-black text-[#4a2633] hover:bg-[#fff8fa]"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs font-medium text-slate-500">
          Showing{' '}
          <span className="font-black text-[#4a2633]">
            {filteredJobs.length}
          </span>{' '}
          of{' '}
          <span className="font-black text-[#4a2633]">
            {jobs.length}
          </span>{' '}
          assigned jobs
        </div>
      </div>

      {/* Table */}

      <div className="dunkin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-[#fff8fa]">
              <tr className="border-b border-[#f3dce5]">
                <th className="px-6 py-4 text-left font-black text-[#4a2633]">
                  Job
                </th>

                <th className="px-6 py-4 text-left font-black text-[#4a2633]">
                  Branch
                </th>

                <th className="px-6 py-4 text-left font-black text-[#4a2633]">
                  Category
                </th>

                <th className="px-6 py-4 text-left font-black text-[#4a2633]">
                  Priority
                </th>

                <th className="px-6 py-4 text-left font-black text-[#4a2633]">
                  Status
                </th>

                <th className="px-6 py-4 text-left font-black text-[#4a2633]">
                  Due Date
                </th>

                <th className="px-6 py-4 text-right font-black text-[#4a2633]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center"
                  >
                    <div className="text-4xl">✓</div>

                    <h3 className="mt-3 font-black text-[#4a2633]">
                      No jobs found
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      No assigned jobs match your current filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const overdue = isOverdue(
                    job.due_at,
                    job.status
                  )

                  return (
                    <tr
                      key={job.id}
                      className="border-b border-[#f3dce5] last:border-0 hover:bg-[#fff8fa]"
                    >
                      <td className="px-6 py-4">
                        <div className="font-black text-[#4a2633]">
                          {job.job_number}
                        </div>

                        <div className="mt-1 max-w-sm truncate text-xs text-slate-500">
                          {job.problem_description}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">
                          {job.branches?.branch_name || '—'}
                        </div>

                        <div className="text-xs text-slate-500">
                          {job.branches?.branch_code || ''}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-700">
                        {job.category}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${priorityClass(
                            job.priority
                          )}`}
                        >
                          {job.priority}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {job.due_at ? (
                          <div
                            className={
                              overdue
                                ? 'font-black text-red-600'
                                : 'text-slate-700'
                            }
                          >
                            {new Date(
                              job.due_at
                            ).toLocaleString()}

                            {overdue && (
                              <div className="mt-1 text-xs font-black">
                                OVERDUE
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/contractor/jobs/${job.id}`}
                          className="inline-flex rounded-lg bg-[#f582ae] px-4 py-2 text-xs font-black text-white transition hover:bg-[#e85d91]"
                        >
                          Open Job
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}