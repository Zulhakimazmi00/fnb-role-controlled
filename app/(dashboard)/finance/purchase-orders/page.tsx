'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role =
  | 'MANAGEMENT'
  | 'HQ_ADMIN'
  | 'HQ_MAINTENANCE'
  | 'FINANCE'
  | 'CONTRACTOR'
  | 'BRANCH_USER'

type ApprovedQuotation = {
  id: string
  quotation_number: string | null
  job_id: string
  total_amount: number
  quotation_date: string | null
  maintenance_jobs: {
    job_number: string
    category: string
    priority: string
    problem_description: string
  } | null
  contractors: {
    company_name: string
    contractor_code: string
  } | null
  branches: {
    branch_name: string
    branch_code: string
  } | null
}

type PurchaseOrder = {
  id: string
  po_number: string
  quotation_id: string
  job_id: string
  contractor_id: string | null
  branch_id: string | null
  po_date: string
  description: string | null
  subtotal: number
  sst_amount: number
  total_amount: number
  status: string
  requested_by: string | null
  approved_by: string | null
  approved_at: string | null
  sent_to_contractor_at: string | null
  remarks: string | null
  created_at: string
  quotations: {
    quotation_number: string | null
  } | null
  maintenance_jobs: {
    job_number: string
    category: string
    priority: string
  } | null
  contractors: {
    company_name: string
    contractor_code: string
  } | null
  branches: {
    branch_name: string
    branch_code: string
  } | null
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(value || 0)
}

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusClass(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 text-green-700'

    case 'SENT':
      return 'bg-blue-100 text-blue-700'

    case 'ACKNOWLEDGED':
      return 'bg-purple-100 text-purple-700'

    case 'PENDING APPROVAL':
      return 'bg-amber-100 text-amber-700'

    case 'CANCELLED':
      return 'bg-red-100 text-red-700'

    case 'CLOSED':
      return 'bg-slate-200 text-slate-700'

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

    default:
      return 'bg-green-100 text-green-700'
  }
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const supabase = createClient()

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [approvedQuotations, setApprovedQuotations] = useState<ApprovedQuotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [contractorFilter, setContractorFilter] =
    useState('ALL')

  useEffect(() => {
    loadPurchaseOrders()
  }, [])

  async function loadPurchaseOrders() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle()

    if (profileError || !profile) {
      setError(
        profileError?.message ||
          'User profile could not be found.'
      )
      setLoading(false)
      return
    }

    if (!profile.is_active) {
      await supabase.auth.signOut()
      router.push('/login')
      return
    }

    const allowedRoles: Role[] = [
      'HQ_ADMIN',
      'FINANCE',
      'MANAGEMENT',
      'HQ_MAINTENANCE',
      'CONTRACTOR',
    ]

    if (!allowedRoles.includes(profile.role as Role)) {
      router.push('/unauthorized')
      return
    }

    let query = supabase
      .from('purchase_orders')
      .select(
        `
        id,
        po_number,
        quotation_id,
        job_id,
        contractor_id,
        branch_id,
        po_date,
        description,
        subtotal,
        sst_amount,
        total_amount,
        status,
        requested_by,
        approved_by,
        approved_at,
        sent_to_contractor_at,
        remarks,
        created_at,
        quotations (
          quotation_number
        ),
        maintenance_jobs (
          job_number,
          category,
          priority
        ),
        contractors (
          company_name,
          contractor_code
        ),
        branches (
          branch_name,
          branch_code
        )
      `
      )
      .order('created_at', {
        ascending: false,
      })

    if (profile.role === 'CONTRACTOR') {
      const { data: contractorProfile } =
        await supabase
          .from('profiles')
          .select('contractor_id')
          .eq('id', user.id)
          .maybeSingle()

      if (!contractorProfile?.contractor_id) {
        setError(
          'Your contractor profile is not linked to a contractor company.'
        )
        setLoading(false)
        return
      }

      query = query.eq(
        'contractor_id',
        contractorProfile.contractor_id
      )
    }

    const { data, error: ordersError } =
      await query

    if (ordersError) {
      setError(ordersError.message)
      setLoading(false)
      return
    }

    const normalizedOrders: PurchaseOrder[] = (data ?? []).map((item) => ({
      ...item,
      subtotal: Number(item.subtotal || 0),
      sst_amount: Number(item.sst_amount || 0),
      total_amount: Number(item.total_amount || 0),
      quotations: Array.isArray(item.quotations)
        ? item.quotations[0] ?? null
        : item.quotations ?? null,
      maintenance_jobs: Array.isArray(item.maintenance_jobs)
        ? item.maintenance_jobs[0] ?? null
        : item.maintenance_jobs ?? null,
      contractors: Array.isArray(item.contractors)
        ? item.contractors[0] ?? null
        : item.contractors ?? null,
      branches: Array.isArray(item.branches)
        ? item.branches[0] ?? null
        : item.branches ?? null,
    })) as PurchaseOrder[]

    setOrders(normalizedOrders)

    const existingQuotationIds = new Set(
      normalizedOrders.map((order) => order.quotation_id)
    )

    let quotationQuery = supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        job_id,
        total_amount,
        quotation_date,
        status,
        maintenance_jobs (
          job_number,
          category,
          priority,
          problem_description,
          contractor_id,
          branch_id,
          contractors (company_name, contractor_code),
          branches (branch_name, branch_code)
        )
      `)
      .eq('status', 'APPROVED')
      .order('quotation_date', { ascending: false })

    const { data: quotationData, error: quotationError } =
      await quotationQuery

    if (quotationError) {
      setError(quotationError.message)
    } else {
      const normalizedQuotations: ApprovedQuotation[] =
        (quotationData ?? [])
          .filter((item) => !existingQuotationIds.has(item.id))
          .map((item) => {
            const rawJob = Array.isArray(item.maintenance_jobs)
              ? item.maintenance_jobs[0] ?? null
              : item.maintenance_jobs ?? null

            return {
              ...item,
              total_amount: Number(item.total_amount || 0),
              maintenance_jobs: rawJob
                ? {
                    job_number: rawJob.job_number,
                    category: rawJob.category,
                    priority: rawJob.priority,
                    problem_description: rawJob.problem_description,
                  }
                : null,
              contractors: Array.isArray(rawJob?.contractors)
                ? rawJob?.contractors[0] ?? null
                : rawJob?.contractors ?? null,
              branches: Array.isArray(rawJob?.branches)
                ? rawJob?.branches[0] ?? null
                : rawJob?.branches ?? null,
            }
          }) as ApprovedQuotation[]

      setApprovedQuotations(normalizedQuotations)
    }

    setLoading(false)
  }

  const branches = useMemo(() => {
    const map = new Map<string, string>()

    orders.forEach((order) => {
      if (order.branch_id && order.branches) {
        map.set(
          order.branch_id,
          `${order.branches.branch_code} — ${order.branches.branch_name}`
        )
      }
    })

    return Array.from(map.entries()).sort(
      (a, b) => a[1].localeCompare(b[1])
    )
  }, [orders])

  const contractors = useMemo(() => {
    const map = new Map<string, string>()

    orders.forEach((order) => {
      if (
        order.contractor_id &&
        order.contractors
      ) {
        map.set(
          order.contractor_id,
          `${order.contractors.contractor_code} — ${order.contractors.company_name}`
        )
      }
    })

    return Array.from(map.entries()).sort(
      (a, b) => a[1].localeCompare(b[1])
    )
  }, [orders])

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        order.po_number
          .toLowerCase()
          .includes(term) ||
        order.quotations?.quotation_number
          ?.toLowerCase()
          .includes(term) ||
        order.maintenance_jobs?.job_number
          ?.toLowerCase()
          .includes(term) ||
        order.contractors?.company_name
          ?.toLowerCase()
          .includes(term) ||
        order.branches?.branch_name
          ?.toLowerCase()
          .includes(term)

      const matchesStatus =
        statusFilter === 'ALL' ||
        order.status === statusFilter

      const matchesBranch =
        branchFilter === 'ALL' ||
        order.branch_id === branchFilter

      const matchesContractor =
        contractorFilter === 'ALL' ||
        order.contractor_id ===
          contractorFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesBranch &&
        matchesContractor
      )
    })
  }, [
    orders,
    search,
    statusFilter,
    branchFilter,
    contractorFilter,
  ])

  const totalValue = filteredOrders.reduce(
    (sum, order) =>
      sum + Number(order.total_amount || 0),
    0
  )

  const approvedCount = filteredOrders.filter(
    (order) => order.status === 'APPROVED'
  ).length

  const pendingCount = filteredOrders.filter(
    (order) =>
      order.status === 'DRAFT' ||
      order.status === 'PENDING APPROVAL'
  ).length

  const sentCount = filteredOrders.filter(
    (order) =>
      order.status === 'SENT' ||
      order.status === 'ACKNOWLEDGED'
  ).length

  function resetFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setBranchFilter('ALL')
    setContractorFilter('ALL')
  }

  async function createPO(quotationId: string) {
    setError('')

    const response = await fetch('/api/finance/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotationId }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result?.error || 'Unable to create purchase order.')
      return
    }

    await loadPurchaseOrders()
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="text-lg font-black text-[#4a2633]">
          Loading Purchase Orders...
        </div>

        <div className="mt-2 text-sm text-slate-500">
          Please wait.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-bold uppercase tracking-wider text-[#f582ae]">
            Finance / Procurement
          </div>

          <h1 className="mt-1 text-3xl font-black text-[#4a2633]">
            Purchase Orders
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage approved maintenance quotations and purchase orders.
          </p>
        </div>

        <Link
          href="/finance/quotations"
          className="inline-flex rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm font-black text-[#4a2633] shadow-sm"
        >
          ← Quotations
        </Link>
      </div>

      {/* Error */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* KPI */}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total POs
          </div>

          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            {filteredOrders.length}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pending
          </div>

          <div className="mt-2 text-3xl font-black text-amber-600">
            {pendingCount}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Approved
          </div>

          <div className="mt-2 text-3xl font-black text-green-600">
            {approvedCount}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            PO Value
          </div>

          <div className="mt-2 text-2xl font-black text-[#f58220]">
            {formatMoney(totalValue)}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {sentCount} sent / acknowledged
          </div>
        </div>
      </div>

      {/* Approved quotations ready for PO */}

      {approvedQuotations.length > 0 && (
        <section className="dunkin-card overflow-hidden">
          <div className="border-b border-[#f3dce5] p-5">
            <h2 className="text-xl font-black text-[#4a2633]">
              Approved Quotations — Ready for PO
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              These quotations have been approved but do not yet have a purchase order.
            </p>
          </div>

          <div className="divide-y divide-[#f3dce5]">
            {approvedQuotations.map((quotation) => (
              <div key={quotation.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-[#4a2633]">
                      {quotation.quotation_number || quotation.id}
                    </span>
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-black text-green-700">
                      APPROVED
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-bold text-slate-700">
                    {quotation.maintenance_jobs?.job_number || '-'} · {quotation.maintenance_jobs?.category || '-'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {quotation.branches?.branch_code || '-'} · {quotation.contractors?.company_name || '-'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Approved Value</div>
                    <div className="text-lg font-black text-[#4a2633]">{formatMoney(quotation.total_amount)}</div>
                  </div>
                  <button
                    onClick={() => createPO(quotation.id)}
                    className="rounded-xl bg-[#f582ae] px-4 py-3 text-sm font-black text-white hover:bg-[#e85d91]"
                  >
                    Create PO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}

      <section className="dunkin-card p-5">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#4a2633]">
              Search
            </label>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="PO, quotation, job, contractor..."
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#4a2633]">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING APPROVAL">
                Pending Approval
              </option>
              <option value="APPROVED">
                Approved
              </option>
              <option value="SENT">Sent</option>
              <option value="ACKNOWLEDGED">
                Acknowledged
              </option>
              <option value="CANCELLED">
                Cancelled
              </option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#4a2633]">
              Branch
            </label>

            <select
              value={branchFilter}
              onChange={(e) =>
                setBranchFilter(e.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="ALL">
                All Branches
              </option>

              {branches.map(
                ([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#4a2633]">
              Contractor
            </label>

            <select
              value={contractorFilter}
              onChange={(e) =>
                setContractorFilter(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="ALL">
                All Contractors
              </option>

              {contractors.map(
                ([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={resetFilters}
            className="rounded-xl border border-[#f3dce5] bg-white px-4 py-2 text-sm font-black text-[#4a2633]"
          >
            Reset Filters
          </button>

          <div className="flex items-center rounded-xl bg-[#fff8fa] px-4 py-2 text-sm text-slate-500">
            Showing{' '}
            <span className="mx-1 font-black text-[#4a2633]">
              {filteredOrders.length}
            </span>
            of{' '}
            <span className="mx-1 font-black text-[#4a2633]">
              {orders.length}
            </span>
            purchase orders
          </div>
        </div>
      </section>

      {/* Table */}

      <section className="dunkin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#f3dce5] p-5">
          <div>
            <h2 className="text-xl font-black text-[#4a2633]">
              Purchase Order Register
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Approved quotation-based procurement records.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-[#fff8fa]">
              <tr>
                <th className="px-5 py-4 font-black text-[#4a2633]">
                  PO
                </th>

                <th className="px-5 py-4 font-black text-[#4a2633]">
                  Quotation
                </th>

                <th className="px-5 py-4 font-black text-[#4a2633]">
                  Job
                </th>

                <th className="px-5 py-4 font-black text-[#4a2633]">
                  Branch
                </th>

                <th className="px-5 py-4 font-black text-[#4a2633]">
                  Contractor
                </th>

                <th className="px-5 py-4 font-black text-[#4a2633]">
                  Priority
                </th>

                <th className="px-5 py-4 font-black text-[#4a2633]">
                  Date
                </th>

                <th className="px-5 py-4 text-right font-black text-[#4a2633]">
                  Total
                </th>

                <th className="px-5 py-4 font-black text-[#4a2633]">
                  Status
                </th>

                <th className="px-5 py-4 text-right font-black text-[#4a2633]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f3dce5]">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="transition hover:bg-[#fff8fa]"
                >
                  <td className="px-5 py-4">
                    <div className="font-black text-[#4a2633]">
                      {order.po_number}
                    </div>

                    {order.description && (
                      <div className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                        {order.description}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4 font-bold text-slate-700">
                    {order.quotations
                      ?.quotation_number ||
                      '-'}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-bold text-[#4a2633]">
                      {order.maintenance_jobs
                        ?.job_number ||
                        '-'}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {order.maintenance_jobs
                        ?.category ||
                        '-'}
                  </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-bold text-[#4a2633]">
                      {order.branches
                        ?.branch_code ||
                        '-'}
                    </div>

                    <div className="text-xs text-slate-400">
                      {order.branches
                        ?.branch_name ||
                        '-'}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-bold text-[#4a2633]">
                      {order.contractors
                        ?.company_name ||
                        '-'}
                    </div>

                    <div className="text-xs text-slate-400">
                      {order.contractors
                        ?.contractor_code ||
                        '-'}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {order.maintenance_jobs
                      ?.priority ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${priorityClass(
                          order
                            .maintenance_jobs
                            .priority
                        )}`}
                      >
                        {
                          order
                            .maintenance_jobs
                            .priority
                        }
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {formatDate(
                      order.po_date
                    )}
                  </td>

                  <td className="px-5 py-4 text-right font-black text-[#4a2633]">
                    {formatMoney(
                      order.total_amount
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${statusClass(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/finance/purchase-orders/${order.id}`}
                      className="inline-flex rounded-lg bg-[#f582ae] px-3 py-2 text-xs font-black text-white hover:bg-[#e85d91]"
                    >
                      Open PO
                    </Link>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-16 text-center"
                  >
                    <div className="text-lg font-black text-[#4a2633]">
                      No purchase orders found
                    </div>

                    <div className="mt-2 text-sm text-slate-500">
                      Try changing the filters or create a PO from an approved quotation.
                    </div>

                    <Link
                      href="/finance/quotations"
                      className="mt-5 inline-flex rounded-xl bg-[#f582ae] px-5 py-3 text-sm font-black text-white"
                    >
                      View Approved Quotations
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}