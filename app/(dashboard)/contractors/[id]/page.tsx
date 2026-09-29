'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Contractor = {
  id: string
  contractor_code: string
  company_name: string
  contact_person: string | null
  contact_phone: string | null
  contact_email: string | null
  address: string | null
  city: string | null
  state: string | null
  service_category: string | null
  coverage_area: string | null
  response_sla_hours: number | null
  completion_sla_hours: number | null
  is_active: boolean
  created_at: string
}

type Job = {
  id: string
  job_number: string
  category: string
  priority: string
  status: string
  problem_description: string
  reported_at: string
  due_at: string | null
  completed_at: string | null
  estimated_cost: number | null
  actual_cost: number | null

  branches?: {
    branch_name: string
    branch_code: string
  } | null

  assets?: {
    asset_code: string
    asset_name: string
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

function formatDateTime(date: string | null) {
  if (!date) return '-'

  return new Date(date).toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value: number | null) {
  if (value == null) return '-'

  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(value)
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
    case 'NEW':
      return 'bg-blue-100 text-blue-700'

    case 'UNDER REVIEW':
    case 'ASSIGNED':
      return 'bg-purple-100 text-purple-700'

    case 'ACCEPTED':
    case 'SITE VISIT':
    case 'DIAGNOSIS':
    case 'REPAIR':
      return 'bg-orange-100 text-orange-700'

    case 'COMPLETED':
    case 'BRANCH VERIFICATION':
    case 'CLOSED':
      return 'bg-green-100 text-green-700'

    case 'ON HOLD':
      return 'bg-yellow-100 text-yellow-700'

    case 'CANCELLED':
    case 'REJECTED':
      return 'bg-red-100 text-red-700'

    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export default function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = createClient()

  const [contractor, setContractor] =
    useState<Contractor | null>(null)

  const [jobs, setJobs] = useState<Job[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      const { id } = await params

      setLoading(true)
      setError('')

      const contractorResult = await supabase
        .from('contractors')
        .select('*')
        .eq('id', id)
        .single()

      if (contractorResult.error) {
        setError(contractorResult.error.message)
        setLoading(false)
        return
      }

      const jobsResult = await supabase
        .from('maintenance_jobs')
        .select('*, branches(branch_name, branch_code), assets(asset_code, asset_name)')
        .eq('contractor_id', id)
        .order('reported_at', {
          ascending: false,
        })

      if (jobsResult.error) {
        setError(jobsResult.error.message)
        setLoading(false)
        return
      }

      setContractor(
        contractorResult.data as Contractor
      )

      setJobs((jobsResult.data ?? []) as Job[])

      setLoading(false)
    }

    loadData()
  }, [])

  const openJobs = jobs.filter(
    (job) =>
      !['COMPLETED', 'BRANCH VERIFICATION', 'CLOSED', 'CANCELLED'].includes(
        job.status
      )
  ).length

  const completedJobs = jobs.filter(
    (job) =>
      ['COMPLETED', 'BRANCH VERIFICATION', 'CLOSED'].includes(
        job.status
      )
  ).length

  const criticalJobs = jobs.filter(
    (job) => job.priority === 'CRITICAL'
  ).length

  const totalCost = jobs.reduce(
    (total, job) =>
      total + Number(job.actual_cost ?? job.estimated_cost ?? 0),
    0
  )

  if (loading) {
    return (
      <div className="space-y-6">

        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#e85d91]">
            Contractor Management
          </p>

          <h1 className="dunkin-heading mt-1 text-3xl font-black">
            Contractor Detail
          </h1>
        </div>

        <div className="dunkin-card p-8 text-sm text-slate-500">
          Loading contractor...
        </div>

      </div>
    )
  }

  if (error || !contractor) {
    return (
      <div className="space-y-6">

        <Link
          href="/contractors"
          className="text-sm font-bold text-[#e85d91] hover:underline"
        >
          ← Back to Contractor Register
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">

          <div className="font-black">
            Unable to load contractor
          </div>

          <div className="mt-1 text-sm">
            {error || 'Contractor not found.'}
          </div>

        </div>

      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>

          <Link
            href="/contractors"
            className="text-sm font-bold text-[#e85d91] hover:underline"
          >
            ← Back to Contractor Register
          </Link>

          <p className="mt-5 text-sm font-bold uppercase tracking-wide text-[#e85d91]">
            Contractor Management
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-3">

            <h1 className="dunkin-heading text-3xl font-black">
              {contractor.company_name}
            </h1>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                contractor.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {contractor.is_active
                ? 'ACTIVE'
                : 'INACTIVE'}
            </span>

          </div>

          <p className="mt-1 text-sm text-slate-500">
            {contractor.contractor_code}
          </p>

        </div>

        <Link
          href={`/contractors/${contractor.id}/edit`}
          className="rounded-xl border border-[#f3dce5] bg-white px-5 py-3 text-sm font-black text-[#4a2633] shadow-sm transition hover:bg-[#fff8fa]"
        >
          Edit Contractor
        </Link>

      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="dunkin-card p-5">

          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total Jobs
          </div>

          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            {jobs.length}
          </div>

        </div>

        <div className="dunkin-card p-5">

          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Open Jobs
          </div>

          <div className="mt-2 text-3xl font-black text-orange-600">
            {openJobs}
          </div>

        </div>

        <div className="dunkin-card p-5">

          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Completed
          </div>

          <div className="mt-2 text-3xl font-black text-green-600">
            {completedJobs}
          </div>

        </div>

        <div className="dunkin-card p-5">

          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Maintenance Cost
          </div>

          <div className="mt-2 text-2xl font-black text-[#4a2633]">
            {formatCurrency(totalCost)}
          </div>

        </div>

      </div>

      {/* COMPANY PROFILE */}
      <div className="grid gap-6 lg:grid-cols-2">

        <section className="dunkin-card p-6">

          <h2 className="text-lg font-black text-[#4a2633]">
            Company Profile
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Contractor Code
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {contractor.contractor_code}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Company Name
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {contractor.company_name}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Address
              </div>

              <div className="mt-1 text-sm text-slate-700">
                {contractor.address || '-'}
              </div>

              {(contractor.city || contractor.state) && (
                <div className="mt-1 text-sm text-slate-500">
                  {[contractor.city, contractor.state]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Service Category
              </div>

              <div className="mt-1 text-sm text-slate-700">
                {contractor.service_category || '-'}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Coverage Area
              </div>

              <div className="mt-1 text-sm text-slate-700">
                {contractor.coverage_area || '-'}
              </div>
            </div>

          </div>

        </section>

        {/* CONTACT */}
        <section className="dunkin-card p-6">

          <h2 className="text-lg font-black text-[#4a2633]">
            Contact Information
          </h2>

          <div className="mt-6 space-y-5">

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Contact Person
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {contractor.contact_person || '-'}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Phone
              </div>

              <div className="mt-1 text-sm text-slate-700">
                {contractor.contact_phone || '-'}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Email
              </div>

              <div className="mt-1 text-sm text-slate-700">
                {contractor.contact_email || '-'}
              </div>
            </div>

          </div>

        </section>

      </div>

      {/* SLA */}
      <section className="dunkin-card p-6">

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-lg font-black text-[#4a2633]">
              Service Level Agreement
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Contractor response and completion targets
            </p>
          </div>

          {criticalJobs > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
              {criticalJobs} Critical Job{criticalJobs !== 1 ? 's' : ''}
            </span>
          )}

        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">

          <div className="rounded-2xl bg-[#fff8fa] p-5">

            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Response SLA
            </div>

            <div className="mt-2 text-2xl font-black text-[#4a2633]">
              {contractor.response_sla_hours != null
                ? `${contractor.response_sla_hours} hours`
                : '-'}
            </div>

          </div>

          <div className="rounded-2xl bg-[#fff8fa] p-5">

            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Completion SLA
            </div>

            <div className="mt-2 text-2xl font-black text-[#4a2633]">
              {contractor.completion_sla_hours != null
                ? `${contractor.completion_sla_hours} hours`
                : '-'}
            </div>

          </div>

        </div>

      </section>

      {/* JOB HISTORY */}
      <section>

        <div className="mb-4">

          <h2 className="text-xl font-black text-[#4a2633]">
            Maintenance Job History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Jobs assigned to this contractor
          </p>

        </div>

        <div className="dunkin-card overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1250px] text-left">

              <thead className="bg-[#fff8fa]">

                <tr className="border-b border-[#f3dce5]">

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Job
                  </th>

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Branch
                  </th>

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Asset
                  </th>

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Category
                  </th>

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Priority
                  </th>

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Reported
                  </th>

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Cost
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-[#f3dce5]">

                {jobs.map((job) => (

                  <tr
                    key={job.id}
                    className="transition hover:bg-[#fff8fa]"
                  >

                    <td className="px-6 py-5">

                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-bold text-[#e85d91] hover:underline"
                      >
                        {job.job_number}
                      </Link>

                      <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                        {job.problem_description}
                      </div>

                    </td>

                    <td className="px-6 py-5">

                      <div className="font-bold text-slate-700">
                        {job.branches?.branch_code || '-'}
                      </div>

                      <div className="text-xs text-slate-500">
                        {job.branches?.branch_name || '-'}
                      </div>

                    </td>

                    <td className="px-6 py-5">

                      <div className="font-bold text-slate-700">
                        {job.assets?.asset_code || '-'}
                      </div>

                      <div className="text-xs text-slate-500">
                        {job.assets?.asset_name || '-'}
                      </div>

                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {job.category}
                    </td>

                    <td className="px-6 py-5">

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${priorityClass(
                          job.priority
                        )}`}
                      >
                        {job.priority}
                      </span>

                    </td>

                    <td className="px-6 py-5">

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>

                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {formatDate(job.reported_at)}
                    </td>

                    <td className="px-6 py-5 text-sm font-bold text-slate-700">
                      {formatCurrency(
                        job.actual_cost ??
                          job.estimated_cost
                      )}
                    </td>

                  </tr>

                ))}

                {jobs.length === 0 && (

                  <tr>

                    <td
                      colSpan={8}
                      className="px-6 py-16 text-center"
                    >

                      <div className="text-lg font-black text-[#4a2633]">
                        No maintenance jobs
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        No jobs have been assigned to this contractor yet.
                      </p>

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      </section>

      {/* CONTRACTOR RECORD */}
      <section className="dunkin-card p-6">

        <h2 className="text-lg font-black text-[#4a2633]">
          Contractor Record
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Registered
            </div>

            <div className="mt-1 text-sm text-slate-700">
              {formatDateTime(contractor.created_at)}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Contractor Status
            </div>

            <div className="mt-1">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  contractor.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {contractor.is_active
                  ? 'ACTIVE'
                  : 'INACTIVE'}
              </span>
            </div>
          </div>

        </div>

      </section>

    </div>
  )
}