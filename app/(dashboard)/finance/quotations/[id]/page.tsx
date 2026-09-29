'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role =
  | 'MANAGEMENT'
  | 'HQ_ADMIN'
  | 'HQ_MAINTENANCE'
  | 'FINANCE'
  | 'CONTRACTOR'
  | 'BRANCH_USER'

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
}

type Job = {
  id: string
  contractor_id: string | null
  job_number: string
  category: string
  priority: string
  status: string
  problem_description: string
  diagnosis: string | null
  work_performed: string | null
  reported_by: string | null
  reported_at: string
  due_at: string | null
  branch: {
    branch_name: string
    branch_code: string
  } | null
  asset: {
    asset_code: string
    asset_name: string
    manufacturer: string | null
    model: string | null
    serial_number: string | null
  } | null
  contractor: {
    company_name: string
    contractor_code: string
    contact_person: string | null
    contact_phone: string | null
    contact_email: string | null
  } | null
}

type Cost = {
  id: string
  cost_type: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

type Attachment = {
  id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  attachment_type: string
  uploaded_by: string | null
  uploaded_at: string
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

function formatDateTime(value: string | null) {
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
    case 'APPROVED':
      return 'bg-green-100 text-green-700'

    case 'REJECTED':
      return 'bg-red-100 text-red-700'

    case 'SUBMITTED':
      return 'bg-blue-100 text-blue-700'

    case 'UNDER REVIEW':
      return 'bg-amber-100 text-amber-700'

    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600'

    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export default function QuotationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const quotationId = String(params.id)

  const [profile, setProfile] = useState<{
    full_name: string
    role: Role
  } | null>(null)

  const [quotation, setQuotation] =
    useState<Quotation | null>(null)

  const [job, setJob] = useState<Job | null>(null)

  const [costs, setCosts] = useState<Cost[]>([])

  const [attachments, setAttachments] =
    useState<Attachment[]>([])

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [rejectRemarks, setRejectRemarks] = useState('')
  const [showRejectBox, setShowRejectBox] = useState(false)

  useEffect(() => {
    loadQuotation()
  }, [quotationId])

  async function loadQuotation() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const {
      data: userProfile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('full_name, role, is_active, contractor_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !userProfile) {
      setError(
        profileError?.message ||
          'User profile could not be found.'
      )
      setLoading(false)
      return
    }

    if (!userProfile.is_active) {
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

    if (!allowedRoles.includes(userProfile.role as Role)) {
      router.push('/unauthorized')
      return
    }

    setProfile({
      full_name: userProfile.full_name,
      role: userProfile.role as Role,
    })

    const {
      data: quotationData,
      error: quotationError,
    } = await supabase
      .from('quotations')
      .select(
        `
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
        remarks
      `
      )
      .eq('id', quotationId)
      .maybeSingle()

    if (quotationError || !quotationData) {
      setError(
        quotationError?.message ||
          'Quotation could not be found.'
      )
      setLoading(false)
      return
    }

    setQuotation({
      ...quotationData,
      subtotal: Number(quotationData.subtotal || 0),
      sst_amount: Number(quotationData.sst_amount || 0),
      total_amount: Number(
        quotationData.total_amount || 0
      ),
    })

    const {
      data: jobData,
      error: jobError,
    } = await supabase
      .from('maintenance_jobs')
      .select(
        `
        id,
        contractor_id,
        job_number,
        category,
        priority,
        status,
        problem_description,
        diagnosis,
        work_performed,
        reported_by,
        reported_at,
        due_at,
        branches (
          branch_name,
          branch_code
        ),
        assets (
          asset_code,
          asset_name,
          manufacturer,
          model,
          serial_number
        ),
        contractors (
          company_name,
          contractor_code,
          contact_person,
          contact_phone,
          contact_email
        )
      `
      )
      .eq('id', quotationData.job_id)
      .maybeSingle()

    if (jobError) {
      setError(jobError.message)
      setLoading(false)
      return
    }

    if (
      userProfile.role === 'CONTRACTOR' &&
      (!userProfile.contractor_id ||
        jobData?.contractor?.company_name === undefined)
    ) {
      // Database RLS already scopes contractor access by the assigned
      // contractor_id on maintenance_jobs. This check is only a UI guard.
      router.push('/unauthorized')
      return
    }

    setJob(jobData as Job | null)

    const {
      data: costData,
      error: costError,
    } = await supabase
      .from('job_costs')
      .select(
        `
        id,
        cost_type,
        description,
        quantity,
        unit_price,
        amount
      `
      )
      .eq('job_id', quotationData.job_id)
      .order('created_at', {
        ascending: true,
      })

    if (costError) {
      setError(costError.message)
      setLoading(false)
      return
    }

    setCosts(
      (costData || []).map((item) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        amount: Number(item.amount || 0),
      }))
    )

    const {
      data: attachmentData,
      error: attachmentError,
    } = await supabase
      .from('job_attachments')
      .select(
        `
        id,
        file_name,
        file_path,
        file_type,
        file_size,
        attachment_type,
        uploaded_by,
        uploaded_at
      `
      )
      .eq('job_id', quotationData.job_id)
      .order('uploaded_at', {
        ascending: false,
      })

    if (attachmentError) {
      setError(attachmentError.message)
      setLoading(false)
      return
    }

    setAttachments(attachmentData || [])

    setLoading(false)
  }

  async function updateQuotationStatus(
    newStatus: 'APPROVED' | 'REJECTED'
  ) {
    if (!quotation || !profile) return

    if (
      profile.role !== 'FINANCE' &&
      profile.role !== 'HQ_ADMIN'
    ) {
      setError(
        'Only Finance or HQ Admin can approve or reject quotations.'
      )
      return
    }

    if (
      newStatus === 'REJECTED' &&
      !rejectRemarks.trim()
    ) {
      setError(
        'Please provide rejection remarks before rejecting the quotation.'
      )
      return
    }

    setActionLoading(true)
    setError('')
    setMessage('')

    const now = new Date().toISOString()

    const updateData: Record<string, unknown> = {
      status: newStatus,
      approved_by:
        newStatus === 'APPROVED'
          ? profile.full_name
          : null,
      approved_at:
        newStatus === 'APPROVED'
          ? now
          : null,
      remarks:
        newStatus === 'REJECTED'
          ? rejectRemarks.trim()
          : quotation.remarks,
      updated_at: now,
    }

    const {
      error: updateError,
    } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', quotation.id)

    if (updateError) {
      setError(updateError.message)
      setActionLoading(false)
      return
    }

    const {
      error: auditError,
    } = await supabase
      .from('job_updates')
      .insert({
        job_id: quotation.job_id,
        update_type: 'QUOTATION_STATUS',
        old_status: quotation.status,
        new_status: newStatus,
        remarks:
          newStatus === 'APPROVED'
            ? `Quotation approved by ${profile.full_name}.`
            : `Quotation rejected by ${profile.full_name}. ${rejectRemarks.trim()}`,
        updated_by: profile.full_name,
        updated_at: now,
      })

    if (auditError) {
      console.error(
        'Quotation audit log error:',
        auditError.message
      )
    }

    setQuotation({
      ...quotation,
      status: newStatus,
      approved_by:
        newStatus === 'APPROVED'
          ? profile.full_name
          : null,
      approved_at:
        newStatus === 'APPROVED'
          ? now
          : null,
      remarks:
        newStatus === 'REJECTED'
          ? rejectRemarks.trim()
          : quotation.remarks,
    })

    setMessage(
      newStatus === 'APPROVED'
        ? 'Quotation approved successfully.'
        : 'Quotation rejected.'
    )

    setShowRejectBox(false)
    setRejectRemarks('')
    setActionLoading(false)
  }

  async function openAttachment(
    attachment: Attachment
  ) {
    setError('')

    const {
      data,
      error: signedUrlError,
    } = await supabase.storage
      .from('maintenance-files')
      .createSignedUrl(
        attachment.file_path,
        600
      )

    if (
      signedUrlError ||
      !data?.signedUrl
    ) {
      setError(
        signedUrlError?.message ||
          'Unable to generate document link.'
      )
      return
    }

    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const calculatedSubtotal = useMemo(() => {
    return costs.reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    )
  }, [costs])

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="text-lg font-black text-[#4a2633]">
          Loading quotation...
        </div>

        <div className="mt-2 text-sm text-slate-500">
          Please wait.
        </div>
      </div>
    )
  }

  if (error && !quotation) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-xl font-black text-red-700">
          Unable to Load Quotation
        </h1>

        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>

        <Link
          href="/finance/quotations"
          className="mt-6 inline-flex rounded-xl bg-[#f582ae] px-5 py-3 text-sm font-black text-white"
        >
          Back to Quotations
        </Link>
      </div>
    )
  }

  if (!quotation) {
    return null
  }

  const canApprove =
    profile?.role === 'FINANCE' ||
    profile?.role === 'HQ_ADMIN'

  const isPending =
    quotation.status === 'PENDING' ||
    quotation.status === 'SUBMITTED' ||
    quotation.status === 'UNDER REVIEW'

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-bold uppercase tracking-wider text-[#f582ae]">
            Finance / Quotation Detail
          </div>

          <h1 className="mt-1 text-3xl font-black text-[#4a2633]">
            {quotation.quotation_number ||
              'Quotation'}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Job:{' '}
            {job?.job_number ||
              quotation.job_id}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/finance/quotations"
            className="rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm font-black text-[#4a2633] shadow-sm"
          >
            ← Back
          </Link>

          {job && (
            <Link
              href={`/jobs/${job.id}`}
              className="rounded-xl bg-[#4a2633] px-4 py-3 text-sm font-black text-white"
            >
              Open Maintenance Job
            </Link>
          )}

          {quotation.status ===
            'APPROVED' &&
            (profile?.role ===
              'FINANCE' ||
              profile?.role ===
                'HQ_ADMIN') && (
              <CreatePOButton
                quotationId={
                  quotation.id
                }
                router={router}
              />
            )}
        </div>
      </div>

      {/* Messages */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      {/* KPI */}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quotation Status
          </div>

          <div className="mt-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-black ${statusClass(
                quotation.status
              )}`}
            >
              {quotation.status}
            </span>
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Subtotal
          </div>

          <div className="mt-2 text-2xl font-black text-[#4a2633]">
            {formatMoney(
              quotation.subtotal
            )}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            SST
          </div>

          <div className="mt-2 text-2xl font-black text-[#4a2633]">
            {formatMoney(
              quotation.sst_amount
            )}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total
          </div>

          <div className="mt-2 text-2xl font-black text-[#f58220]">
            {formatMoney(
              quotation.total_amount
            )}
          </div>
        </div>
      </div>

      {/* Quotation Information */}

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="dunkin-card p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#4a2633]">
              Quotation Information
            </h2>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                quotation.status
              )}`}
            >
              {quotation.status}
            </span>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Info
              label="Quotation Number"
              value={
                quotation.quotation_number ||
                '-'
              }
            />

            <Info
              label="Quotation Date"
              value={formatDate(
                quotation.quotation_date
              )}
            />

            <Info
              label="Submitted"
              value={formatDateTime(
                quotation.submitted_at
              )}
            />

            <Info
              label="Approved / Rejected By"
              value={
                quotation.approved_by ||
                '-'
              }
            />

            <Info
              label="Approval Date"
              value={formatDateTime(
                quotation.approved_at
              )}
            />

            <Info
              label="Calculated Cost from Job"
              value={formatMoney(
                calculatedSubtotal
              )}
            />
          </div>

          {quotation.remarks && (
            <div className="mt-6 rounded-xl bg-[#fff8fa] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Remarks
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {quotation.remarks}
              </p>
            </div>
          )}
        </section>

        {/* Approval */}

        <section className="dunkin-card p-6">
          <h2 className="text-xl font-black text-[#4a2633]">
            Approval
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Finance approval controls for this quotation.
          </p>

          {canApprove && isPending ? (
            <div className="mt-6 space-y-3">
              <button
                onClick={() =>
                  updateQuotationStatus(
                    'APPROVED'
                  )
                }
                disabled={actionLoading}
                className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading
                  ? 'Processing...'
                  : 'Approve Quotation'}
              </button>

              {!showRejectBox ? (
                <button
                  onClick={() =>
                    setShowRejectBox(true)
                  }
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100"
                >
                  Reject Quotation
                </button>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <label className="text-xs font-black uppercase tracking-wider text-red-700">
                    Rejection Remarks
                  </label>

                  <textarea
                    value={rejectRemarks}
                    onChange={(e) =>
                      setRejectRemarks(
                        e.target.value
                      )
                    }
                    rows={4}
                    placeholder="Enter reason for rejection..."
                    className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-3 text-sm outline-none focus:border-red-400"
                  />

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        updateQuotationStatus(
                          'REJECTED'
                        )
                      }
                      disabled={actionLoading}
                      className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white"
                    >
                      Confirm Reject
                    </button>

                    <button
                      onClick={() => {
                        setShowRejectBox(
                          false
                        )
                        setRejectRemarks('')
                      }}
                      disabled={actionLoading}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {quotation.status ===
              'APPROVED'
                ? 'This quotation has already been approved. You can create a Purchase Order from the button above.'
                : quotation.status ===
                  'REJECTED'
                ? 'This quotation has been rejected.'
                : 'You do not have approval authority for this quotation.'}
            </div>
          )}
        </section>
      </div>

      {/* Job Information */}

      {job && (
        <section className="dunkin-card p-6">
          <h2 className="text-xl font-black text-[#4a2633]">
            Maintenance Job
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Job Number"
              value={job.job_number}
            />

            <Info
              label="Category"
              value={job.category}
            />

            <Info
              label="Priority"
              value={job.priority}
            />

            <Info
              label="Job Status"
              value={job.status}
            />

            <Info
              label="Branch"
              value={
                job.branch
                  ? `${job.branch.branch_code} — ${job.branch.branch_name}`
                  : '-'
              }
            />

            <Info
              label="Reported By"
              value={
                job.reported_by || '-'
              }
            />

            <Info
              label="Reported At"
              value={formatDateTime(
                job.reported_at
              )}
            />

            <Info
              label="Due"
              value={formatDateTime(
                job.due_at
              )}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <TextBlock
              label="Problem Description"
              value={
                job.problem_description
              }
            />

            <TextBlock
              label="Diagnosis"
              value={
                job.diagnosis || '-'
              }
            />

            <TextBlock
              label="Work Performed"
              value={
                job.work_performed || '-'
              }
            />
          </div>
        </section>
      )}

      {/* Contractor and Asset */}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="dunkin-card p-6">
          <h2 className="text-xl font-black text-[#4a2633]">
            Contractor
          </h2>

          {job?.contractor ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Info
                label="Company"
                value={
                  job.contractor
                    .company_name
                }
              />

              <Info
                label="Contractor Code"
                value={
                  job.contractor
                    .contractor_code
                }
              />

              <Info
                label="Contact Person"
                value={
                  job.contractor
                    .contact_person ||
                  '-'
                }
              />

              <Info
                label="Phone"
                value={
                  job.contractor
                    .contact_phone ||
                  '-'
                }
              />

              <Info
                label="Email"
                value={
                  job.contractor
                    .contact_email ||
                  '-'
                }
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No contractor assigned.
            </p>
          )}
        </section>

        <section className="dunkin-card p-6">
          <h2 className="text-xl font-black text-[#4a2633]">
            Asset
          </h2>

          {job?.asset ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Info
                label="Asset Code"
                value={
                  job.asset.asset_code
                }
              />

              <Info
                label="Asset Name"
                value={
                  job.asset.asset_name
                }
              />

              <Info
                label="Manufacturer"
                value={
                  job.asset.manufacturer ||
                  '-'
                }
              />

              <Info
                label="Model"
                value={
                  job.asset.model || '-'
                }
              />

              <Info
                label="Serial Number"
                value={
                  job.asset.serial_number ||
                  '-'
                }
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No asset linked to this job.
            </p>
          )}
        </section>
      </div>

      {/* Cost Breakdown */}

      <section className="dunkin-card overflow-hidden">
        <div className="border-b border-[#f3dce5] p-6">
          <h2 className="text-xl font-black text-[#4a2633]">
            Cost Breakdown
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Maintenance job cost lines associated with this quotation.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#fff8fa]">
              <tr>
                <th className="px-6 py-4 font-black text-[#4a2633]">
                  Type
                </th>

                <th className="px-6 py-4 font-black text-[#4a2633]">
                  Description
                </th>

                <th className="px-6 py-4 text-right font-black text-[#4a2633]">
                  Qty
                </th>

                <th className="px-6 py-4 text-right font-black text-[#4a2633]">
                  Unit Price
                </th>

                <th className="px-6 py-4 text-right font-black text-[#4a2633]">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f3dce5]">
              {costs.map((cost) => (
                <tr key={cost.id}>
                  <td className="px-6 py-4 font-bold text-slate-700">
                    {cost.cost_type}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {cost.description}
                  </td>

                  <td className="px-6 py-4 text-right text-slate-600">
                    {cost.quantity}
                  </td>

                  <td className="px-6 py-4 text-right text-slate-600">
                    {formatMoney(
                      cost.unit_price
                    )}
                  </td>

                  <td className="px-6 py-4 text-right font-black text-[#4a2633]">
                    {formatMoney(
                      cost.amount
                    )}
                  </td>
                </tr>
              ))}

              {costs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    No cost lines found.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot className="bg-[#fff8fa]">
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-right font-black text-[#4a2633]"
                >
                  Job Cost Subtotal
                </td>

                <td className="px-6 py-4 text-right text-lg font-black text-[#f58220]">
                  {formatMoney(
                    calculatedSubtotal
                  )}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-right font-black text-[#4a2633]"
                >
                  Quotation Subtotal
                </td>

                <td className="px-6 py-4 text-right text-lg font-black text-[#4a2633]">
                  {formatMoney(
                    quotation.subtotal
                  )}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-right font-black text-[#4a2633]"
                >
                  SST
                </td>

                <td className="px-6 py-4 text-right text-lg font-black text-[#4a2633]">
                  {formatMoney(
                    quotation.sst_amount
                  )}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-right font-black text-[#4a2633]"
                >
                  Quotation Total
                </td>

                <td className="px-6 py-4 text-right text-xl font-black text-[#f58220]">
                  {formatMoney(
                    quotation.total_amount
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Attachments */}

      <section className="dunkin-card p-6">
        <h2 className="text-xl font-black text-[#4a2633]">
          Supporting Documents
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Documents and evidence attached to this maintenance job.
        </p>

        <div className="mt-5 space-y-3">
          {attachments.map(
            (attachment) => (
              <div
                key={attachment.id}
                className="flex flex-col gap-3 rounded-xl border border-[#f3dce5] bg-[#fff8fa] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-bold text-[#4a2633]">
                    {attachment.file_name}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {
                      attachment.attachment_type
                    }{' '}
                    ·{' '}
                    {attachment.uploaded_by ||
                      'Unknown uploader'}{' '}
                    ·{' '}
                    {formatDateTime(
                      attachment.uploaded_at
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    openAttachment(
                      attachment
                    )
                  }
                  className="rounded-xl bg-[#f582ae] px-4 py-2 text-sm font-black text-white hover:bg-[#e85d91]"
                >
                  Open Document
                </button>
              </div>
            )
          )}

          {attachments.length === 0 && (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              No supporting documents attached.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function CreatePOButton({
  quotationId,
  router,
}: {
  quotationId: string
  router: ReturnType<typeof useRouter>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createPO() {
    const confirmed = window.confirm(
      'Create a Purchase Order from this approved quotation?'
    )

    if (!confirmed) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        '/api/finance/purchase-orders',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quotationId,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        setError(
          result.error ||
            'Unable to create purchase order.'
        )
        setLoading(false)
        return
      }

      router.push(
        `/finance/purchase-orders/${result.poId}`
      )
    } catch {
      setError(
        'Unable to connect to the purchase order service.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={createPO}
        disabled={loading}
        className="rounded-xl bg-[#f58220] px-4 py-3 text-sm font-black text-white transition hover:bg-[#df6d0d] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? 'Creating Purchase Order...'
          : 'Create Purchase Order'}
      </button>

      {error && (
        <div className="max-w-xs rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-bold text-[#4a2633]">
        {value}
      </div>
    </div>
  )
}

function TextBlock({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-[#fff8fa] p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {value}
      </div>
    </div>
  )
}
