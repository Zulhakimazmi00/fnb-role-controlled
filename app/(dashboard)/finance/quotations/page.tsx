

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Quotation = {
  id: string
  job_id: string
  quotation_number: string | null
  quotation_date: string | null
  subtotal: number
  sst_amount: number
  total_amount: number
  status: string
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  remarks: string | null
  maintenance_jobs:
    | {
        job_number: string
        category: string
        priority: string
        status: string
        branches:
          | {
              branch_code: string
              branch_name: string
            }
          | null
        contractors:
          | {
              contractor_code: string
              company_name: string
            }
          | null
      }
    | null
}

const statuses = [
  'ALL',
  'PENDING',
  'SUBMITTED',
  'UNDER REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]

export default function FinanceQuotationsPage() {
  const supabase = createClient()

  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    loadQuotations()
  }, [])

  async function loadQuotations() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('You are not authenticated.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('role, is_active, contractor_id')
        .eq('id', user.id)
        .maybeSingle()

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    if (
      !profile ||
      !profile.is_active ||
      !['FINANCE', 'HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE', 'CONTRACTOR'].includes(
        profile.role
      )
    ) {
      setError(
        'You do not have permission to access Finance Quotations.'
      )
      setLoading(false)
      return
    }

    let quotationQuery = supabase
      .from('quotations')
      .select(`
        id,
        job_id,
        quotation_number,
        quotation_date,
        subtotal,
        sst_amount,
        total_amount,
        status,
        submitted_at,
        approved_at,
        approved_by,
        remarks,
        maintenance_jobs (
          job_number,
          category,
          priority,
          status,
          branches (
            branch_code,
            branch_name
          ),
          contractors (
            contractor_code,
            company_name
          )
        )
      `)

    if (profile.role === 'CONTRACTOR') {
      if (!profile.contractor_id) {
        setError('Your account is not linked to a contractor company.')
        setLoading(false)
        return
      }
      // Contractor ownership is derived through quotations.job_id -> maintenance_jobs.contractor_id.
      // RLS enforces the same ownership at the database level.
    }

    const { data, error: quotationError } = await quotationQuery.order(
      'created_at',
      { ascending: false }
    )

    if (quotationError) {
      setError(quotationError.message)
      setLoading(false)
      return
    }

    const normalized: Quotation[] = (data || []).map((item) => {
      const rawJob = Array.isArray(item.maintenance_jobs)
        ? item.maintenance_jobs[0] ?? null
        : item.maintenance_jobs ?? null

      return {
        ...item,
        maintenance_jobs: rawJob
          ? {
              ...rawJob,
              branches: Array.isArray(rawJob.branches)
                ? rawJob.branches[0] ?? null
                : rawJob.branches ?? null,
              contractors: Array.isArray(rawJob.contractors)
                ? rawJob.contractors[0] ?? null
                : rawJob.contractors ?? null,
            }
          : null,
      }
    }) as Quotation[]

    setQuotations(normalized)

    setLoading(false)
  }

  const filteredQuotations = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return quotations.filter((quotation) => {
      const job = quotation.maintenance_jobs

      const matchesSearch =
        !searchValue ||
        quotation.quotation_number
          ?.toLowerCase()
          .includes(searchValue) ||
        job?.job_number
          ?.toLowerCase()
          .includes(searchValue) ||
        job?.branches?.branch_name
          ?.toLowerCase()
          .includes(searchValue) ||
        job?.contractors?.company_name
          ?.toLowerCase()
          .includes(searchValue)

      const matchesStatus =
        statusFilter === 'ALL' ||
        quotation.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [quotations, search, statusFilter])

  const totalValue = filteredQuotations.reduce(
    (sum, quotation) =>
      sum + Number(quotation.total_amount || 0),
    0
  )

  const pendingCount = quotations.filter(
    (quotation) =>
      quotation.status === 'PENDING' ||
      quotation.status === 'SUBMITTED' ||
      quotation.status === 'UNDER REVIEW'
  ).length

  const approvedCount = quotations.filter(
    (quotation) => quotation.status === 'APPROVED'
  ).length

  const rejectedCount = quotations.filter(
    (quotation) => quotation.status === 'REJECTED'
  ).length

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(value)
  }

  function formatDate(value: string | null) {
    if (!value) return '-'

    return new Intl.DateTimeFormat('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  }

  function statusClass(status: string) {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700'

      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-700'

      case 'UNDER REVIEW':
      case 'SUBMITTED':
        return 'bg-orange-100 text-orange-700'

      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f582ae]">
            Finance
          </div>

          <h1 className="mt-1 text-3xl font-black text-[#4a2633]">
            Quotations
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review and monitor contractor maintenance quotations.
          </p>
        </div>

        <Link
          href="/jobs"
          className="rounded-xl bg-[#4a2633] px-5 py-3 text-center text-sm font-black text-white transition hover:opacity-90"
        >
          View Jobs
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="dunkin-card p-5">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
            Total Quotations
          </div>

          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            {quotations.length}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
            Pending Review
          </div>

          <div className="mt-2 text-3xl font-black text-orange-600">
            {pendingCount}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
            Approved
          </div>

          <div className="mt-2 text-3xl font-black text-green-600">
            {approvedCount}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
            Filtered Value
          </div>

          <div className="mt-2 text-2xl font-black text-[#4a2633]">
            {formatCurrency(totalValue)}
          </div>
        </div>
      </div>

      <div className="dunkin-card p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
              Search
            </label>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Quotation, job, branch or contractor..."
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch('')
              setStatusFilter('ALL')
            }}
            className="self-end rounded-xl border border-[#f3dce5] px-5 py-3 text-sm font-black text-[#4a2633] hover:bg-[#fff8fa]"
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="dunkin-card overflow-hidden">
        <div className="border-b border-[#f3dce5] px-5 py-4">
          <div className="font-black text-[#4a2633]">
            Quotation Register
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {filteredQuotations.length} quotation(s)
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading quotations...
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-lg font-black text-[#4a2633]">
              No quotations found
            </div>

            <div className="mt-2 text-sm text-slate-500">
              Quotations submitted against maintenance jobs will appear here.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-[#fff8fa]">
                <tr className="border-b border-[#f3dce5]">
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                    Quotation
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                    Job
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                    Branch
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                    Contractor
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredQuotations.map((quotation) => {
                  const job =
                    quotation.maintenance_jobs

                  return (
                    <tr
                      key={quotation.id}
                      className="border-b border-[#f3dce5] last:border-0 hover:bg-[#fff8fa]"
                    >
                      <td className="px-5 py-4">
                        <div className="font-black text-[#4a2633]">
                          {quotation.quotation_number ||
                            'No quotation number'}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {quotation.id.slice(0, 8)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                            href={`/finance/quotations/${quotation.id}`}
                            className="rounded-lg bg-[#f582ae] px-3 py-2 text-xs font-black text-white hover:bg-[#e85d91]"
                            >
                            Open Quotation
                        </Link>

                        <div className="mt-1 text-xs text-slate-400">
                          {job?.category || '-'}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-[#4a2633]">
                          {job?.branches?.branch_code ||
                            '-'}
                        </div>

                        <div className="text-xs text-slate-400">
                          {job?.branches?.branch_name ||
                            '-'}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-[#4a2633]">
                          {job?.contractors?.company_name ||
                            '-'}
                        </div>

                        <div className="text-xs text-slate-400">
                          {job?.contractors?.contractor_code ||
                            '-'}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(
                          quotation.quotation_date
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-black text-[#4a2633]">
                          {formatCurrency(
                            Number(
                              quotation.total_amount || 0
                            )
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass(
                            quotation.status
                          )}`}
                        >
                          {quotation.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectedCount > 0 && (
        <div className="text-xs text-slate-400">
          {rejectedCount} quotation(s) currently rejected.
        </div>
      )}
    </div>
  )
}

