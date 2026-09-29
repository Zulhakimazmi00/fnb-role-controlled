'use client'

import { useEffect, useState } from 'react'
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

type Contractor = {
  id: string
  contractor_code: string
  company_name: string
  contact_person: string | null
  contact_phone: string | null
  service_category: string | null
  coverage_area: string | null
  response_sla_hours: number | null
  completion_sla_hours: number | null
  is_active: boolean
}

const supabase = createClient()

function getPriorityClass(priority: string) {
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

function getStatusClass(status: string) {
  switch (status) {
    case 'NEW':
      return 'bg-slate-100 text-slate-700'
    case 'UNDER REVIEW':
      return 'bg-blue-100 text-blue-700'
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
    case 'ON HOLD':
      return 'bg-gray-100 text-gray-700'
    case 'CANCELLED':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function isOverdue(dueAt: string | null, status: string) {
  if (!dueAt) return false

  if (
    status === 'COMPLETED' ||
    status === 'BRANCH VERIFICATION' ||
    status === 'CLOSED' ||
    status === 'CANCELLED'
  ) {
    return false
  }

  return new Date(dueAt).getTime() < Date.now()
}

export default function ContractorDashboard() {
  const [contractor, setContractor] = useState<Contractor | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setError('You are not authenticated.')
          return
        }

        const { data: profile, error: profileError } =
          await supabase
            .from('profiles')
            .select('id, role, contractor_id, is_active')
            .eq('id', user.id)
            .maybeSingle()

        if (profileError) {
          throw new Error(profileError.message)
        }

        if (!profile) {
          throw new Error('Your profile could not be found.')
        }

        if (profile.role !== 'CONTRACTOR') {
          throw new Error(
            'This page is only available to contractor users.'
          )
        }

        if (!profile.is_active) {
          throw new Error(
            'Your contractor account is currently inactive.'
          )
        }

        if (!profile.contractor_id) {
          throw new Error(
            'Your account is not linked to a contractor company.'
          )
        }

        const [contractorResult, jobsResult] =
          await Promise.all([
            supabase
              .from('contractors')
              .select(
                'id, contractor_code, company_name, contact_person, contact_phone, service_category, coverage_area, response_sla_hours, completion_sla_hours, is_active'
              )
              .eq('id', profile.contractor_id)
              .maybeSingle(),

            supabase
              .from('maintenance_jobs')
              .select(
                'id, job_number, category, priority, status, problem_description, due_at, reported_at, branches(branch_name, branch_code)'
              )
              .eq('contractor_id', profile.contractor_id)
              .order('reported_at', {
                ascending: false,
              }),
          ])

        if (contractorResult.error) {
          throw new Error(contractorResult.error.message)
        }

        if (jobsResult.error) {
          throw new Error(jobsResult.error.message)
        }

        setContractor(contractorResult.data)

        const normalizedJobs: Job[] = (jobsResult.data ?? []).map((item) => ({
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
            : 'Unable to load contractor dashboard.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const awaitingAcceptance = jobs.filter(
    (job) => job.status === 'ASSIGNED'
  ).length

  const accepted = jobs.filter(
    (job) => job.status === 'ACCEPTED'
  ).length

  const siteVisit = jobs.filter(
    (job) =>
      job.status === 'SITE VISIT' ||
      job.status === 'DIAGNOSIS'
  ).length

  const quotationRequired = jobs.filter(
    (job) => job.status === 'QUOTATION SUBMITTED'
  ).length

  const completed = jobs.filter(
    (job) =>
      job.status === 'COMPLETED' ||
      job.status === 'BRANCH VERIFICATION' ||
      job.status === 'CLOSED'
  ).length

  const overdue = jobs.filter((job) =>
    isOverdue(job.due_at, job.status)
  ).length

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#f3dce5] border-t-[#f582ae]" />
          <p className="mt-4 text-sm text-slate-500">
            Loading contractor portal...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-black text-red-700">
          Contractor Portal Error
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

      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#f582ae] to-[#f58220] p-8 text-white shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-white/80">
              DUNKIN' MAINTENANCE
            </div>

            <h1 className="mt-2 text-3xl font-black">
              Contractor Portal
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-white/90">
              Manage your assigned maintenance jobs,
              site visits, quotations and completion updates.
            </p>
          </div>

          <Link
            href="/contractor/jobs"
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-black text-[#4a2633] shadow-sm transition hover:bg-white/90"
          >
            View Assigned Jobs →
          </Link>
        </div>
      </div>

      {/* Company */}

      {contractor && (
        <div className="dunkin-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-[#f582ae]">
                Contractor Company
              </div>

              <h2 className="mt-1 text-xl font-black text-[#4a2633]">
                {contractor.company_name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {contractor.contractor_code}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-[#fff8fa] p-3">
                <div className="text-xs text-slate-500">
                  Contact
                </div>
                <div className="mt-1 text-sm font-bold text-[#4a2633]">
                  {contractor.contact_person || '—'}
                </div>
              </div>

              <div className="rounded-xl bg-[#fff8fa] p-3">
                <div className="text-xs text-slate-500">
                  Service
                </div>
                <div className="mt-1 text-sm font-bold text-[#4a2633]">
                  {contractor.service_category || '—'}
                </div>
              </div>

              <div className="rounded-xl bg-[#fff8fa] p-3">
                <div className="text-xs text-slate-500">
                  Response SLA
                </div>
                <div className="mt-1 text-sm font-bold text-[#4a2633]">
                  {contractor.response_sla_hours
                    ? `${contractor.response_sla_hours}h`
                    : '—'}
                </div>
              </div>

              <div className="rounded-xl bg-[#fff8fa] p-3">
                <div className="text-xs text-slate-500">
                  Completion SLA
                </div>
                <div className="mt-1 text-sm font-bold text-[#4a2633]">
                  {contractor.completion_sla_hours
                    ? `${contractor.completion_sla_hours}h`
                    : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Awaiting Acceptance
          </div>
          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            {awaitingAcceptance}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Accepted
          </div>
          <div className="mt-2 text-3xl font-black text-indigo-600">
            {accepted}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Site / Diagnosis
          </div>
          <div className="mt-2 text-3xl font-black text-cyan-600">
            {siteVisit}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quotations
          </div>
          <div className="mt-2 text-3xl font-black text-orange-600">
            {quotationRequired}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Completed
          </div>
          <div className="mt-2 text-3xl font-black text-emerald-600">
            {completed}
          </div>
        </div>

        <div className="dunkin-card border-red-200 p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-red-500">
            Overdue
          </div>
          <div className="mt-2 text-3xl font-black text-red-600">
            {overdue}
          </div>
        </div>
      </div>

      {/* Recent Jobs */}

      <div className="dunkin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#f3dce5] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#4a2633]">
              Recent Assigned Jobs
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your latest maintenance assignments from HQ.
            </p>
          </div>

          <Link
            href="/contractor/jobs"
            className="text-sm font-black text-[#f582ae] hover:text-[#e85d91]"
          >
            View All Jobs →
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl">✓</div>

            <h3 className="mt-3 text-lg font-black text-[#4a2633]">
              No assigned jobs
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              New assignments from HQ will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
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
                    Due
                  </th>

                  <th className="px-6 py-4 text-right font-black text-[#4a2633]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {jobs.slice(0, 10).map((job) => {
                  const overdueJob = isOverdue(
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

                        <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
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
                          className={`rounded-full px-3 py-1 text-xs font-black ${getPriorityClass(
                            job.priority
                          )}`}
                        >
                          {job.priority}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
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
                              overdueJob
                                ? 'font-black text-red-600'
                                : 'text-slate-700'
                            }
                          >
                            {new Date(
                              job.due_at
                            ).toLocaleString()}
                            {overdueJob && (
                              <div className="text-xs">
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
                          className="rounded-lg bg-[#f582ae] px-4 py-2 text-xs font-black text-white transition hover:bg-[#e85d91]"
                        >
                          Open
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

      {/* Quick Actions */}

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/contractor/jobs"
          className="dunkin-card group p-6 transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="text-2xl">📋</div>

          <h3 className="mt-4 font-black text-[#4a2633]">
            Assigned Jobs
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            View and manage all jobs assigned by HQ.
          </p>
        </Link>

        <Link
          href="/finance/quotations"
          className="dunkin-card group p-6 transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="text-2xl">💰</div>

          <h3 className="mt-4 font-black text-[#4a2633]">
            Quotations
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Review and submit quotations for maintenance jobs.
          </p>
        </Link>

        <Link
          href="/contractor/jobs"
          className="dunkin-card group p-6 transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="text-2xl">🔧</div>

          <h3 className="mt-4 font-black text-[#4a2633]">
            Job Updates
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Update technicians, visits, diagnosis and completed work.
          </p>
        </Link>
      </div>
    </div>
  )
}