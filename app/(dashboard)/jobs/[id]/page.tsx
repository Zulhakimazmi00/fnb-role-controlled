
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

type Attachment = {
  id: string
  job_id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  attachment_type: string
  uploaded_by: string | null
  uploaded_at: string
  signedUrl?: string
}

const workflowSteps = [
  'NEW',
  'UNDER REVIEW',
  'ASSIGNED',
  'ACCEPTED',
  'SITE VISIT',
  'DIAGNOSIS',
  'QUOTATION SUBMITTED',
  'HQ APPROVAL',
  'APPROVED',
  'REPAIR',
  'COMPLETED',
  'BRANCH VERIFICATION',
  'CLOSED',
]

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Date(value).toLocaleString('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatDateOnly(value: string | null) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('en-MY', {
    dateStyle: 'medium',
  })
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) {
    return 'RM 0.00'
  }

  return `RM ${Number(value).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatFileSize(size: number | null) {
  if (!size) return '-'

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

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
      return 'bg-violet-100 text-violet-700'

    case 'QUOTATION SUBMITTED':
      return 'bg-orange-100 text-orange-700'

    case 'HQ APPROVAL':
      return 'bg-yellow-100 text-yellow-700'

    case 'APPROVED':
      return 'bg-lime-100 text-lime-700'

    case 'REPAIR':
      return 'bg-orange-100 text-orange-700'

    case 'COMPLETED':
      return 'bg-green-100 text-green-700'

    case 'BRANCH VERIFICATION':
      return 'bg-pink-100 text-pink-700'

    case 'CLOSED':
      return 'bg-emerald-100 text-emerald-700'

    case 'ON HOLD':
      return 'bg-yellow-100 text-yellow-700'

    case 'CANCELLED':
      return 'bg-red-100 text-red-700'

    case 'REJECTED':
      return 'bg-red-100 text-red-700'

    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function getEvidenceLabel(type: string) {
  switch (type) {
    case 'BEFORE WORK':
      return 'Before Work'

    case 'DURING WORK':
      return 'During Work'

    case 'AFTER WORK':
      return 'After Work'

    case 'OTHER':
      return 'Other Documents'

    default:
      return type
  }
}

function isImage(fileType: string | null) {
  return !!fileType && fileType.startsWith('image/')
}

export default async function JobDetailPage({
  params,
}: PageProps) {
  const { id } = await params

  const supabase = await createClient()

  /*
   * ---------------------------------------------------------
   * AUTHENTICATION
   * ---------------------------------------------------------
   */

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  /*
   * ---------------------------------------------------------
   * PROFILE / ROLE
   * ---------------------------------------------------------
   */

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    notFound()
  }

  const allowedRoles = [
    'MANAGEMENT',
    'HQ_ADMIN',
    'HQ_MAINTENANCE',
    'FINANCE',
  ]

  if (!allowedRoles.includes(profile.role)) {
    notFound()
  }

  /*
   * ---------------------------------------------------------
   * LOAD JOB
   *
   * Supports:
   * /jobs/<UUID>
   * /jobs/MNT-2026-00001
   * ---------------------------------------------------------
   */

  const { data: job, error: jobError } =
    await supabase
      .from('maintenance_jobs')
      .select(`
        *,
        branches (
          branch_name,
          branch_code,
          address,
          city,
          state
        ),
        assets (
          asset_code,
          asset_name,
          asset_category,
          manufacturer,
          model,
          serial_number,
          warranty_expiry
        ),
        contractors (
          contractor_code,
          company_name,
          contact_person,
          contact_phone,
          contact_email
        )
      `)
      .or(`id.eq.${id},job_number.eq.${id}`)
      .maybeSingle()

  if (jobError || !job) {
    notFound()
  }

  /*
   * IMPORTANT:
   * Always use the real database UUID from here onward.
   */
  const jobId = job.id

  /*
   * ---------------------------------------------------------
   * LOAD RELATED DATA
   * ---------------------------------------------------------
   */

  const [
    { data: updates },
    { data: quotations },
    { data: costs },
    { data: attachmentData },
  ] = await Promise.all([
    supabase
      .from('job_updates')
      .select(`
        id,
        old_status,
        new_status,
        remarks,
        updated_by,
        updated_at,
        update_type
      `)
      .eq('job_id', jobId)
      .order('updated_at', {
        ascending: false,
      }),

    supabase
      .from('quotations')
      .select(`
        id,
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
        created_at
      `)
      .eq('job_id', jobId)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('job_costs')
      .select(`
        id,
        cost_type,
        description,
        quantity,
        unit_price,
        amount,
        created_at
      `)
      .eq('job_id', jobId)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('job_attachments')
      .select(`
        id,
        job_id,
        file_name,
        file_path,
        file_type,
        file_size,
        attachment_type,
        uploaded_by,
        uploaded_at
      `)
      .eq('job_id', jobId)
      .order('uploaded_at', {
        ascending: false,
      }),
  ])

  /*
   * ---------------------------------------------------------
   * SIGNED URLS FOR PRIVATE STORAGE
   *
   * Bucket remains PRIVATE.
   * URLs are valid for 1 hour.
   * ---------------------------------------------------------
   */

  const attachments: Attachment[] =
    await Promise.all(
      (attachmentData || []).map(
        async (attachment) => {
          const {
            data: signedData,
          } = await supabase.storage
            .from('maintenance-files')
            .createSignedUrl(
              attachment.file_path,
              60 * 60
            )

          return {
            ...attachment,
            signedUrl:
              signedData?.signedUrl || '',
          }
        }
      )
    )

  /*
   * ---------------------------------------------------------
   * NORMALIZE RELATIONSHIPS
   * ---------------------------------------------------------
   */

  const branch = Array.isArray(job.branches)
    ? job.branches[0]
    : job.branches

  const asset = Array.isArray(job.assets)
    ? job.assets[0]
    : job.assets

  const contractor = Array.isArray(
    job.contractors
  )
    ? job.contractors[0]
    : job.contractors

  /*
   * ---------------------------------------------------------
   * COST CALCULATIONS
   * ---------------------------------------------------------
   */

  const totalCost =
    (costs || []).reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    )

  const estimatedCost =
    job.estimated_cost !== null &&
    job.estimated_cost !== undefined
      ? Number(job.estimated_cost)
      : null

  const actualCost =
    job.actual_cost !== null &&
    job.actual_cost !== undefined
      ? Number(job.actual_cost)
      : null

  /*
   * ---------------------------------------------------------
   * WORKFLOW
   * ---------------------------------------------------------
   */

  const currentStepIndex =
    workflowSteps.indexOf(job.status)

  /*
   * ---------------------------------------------------------
   * GROUP EVIDENCE
   * ---------------------------------------------------------
   */

  const evidenceGroups = [
    {
      type: 'BEFORE WORK',
      files: attachments.filter(
        (item) =>
          item.attachment_type ===
          'BEFORE WORK'
      ),
    },
    {
      type: 'DURING WORK',
      files: attachments.filter(
        (item) =>
          item.attachment_type ===
          'DURING WORK'
      ),
    },
    {
      type: 'AFTER WORK',
      files: attachments.filter(
        (item) =>
          item.attachment_type ===
          'AFTER WORK'
      ),
    },
    {
      type: 'OTHER',
      files: attachments.filter(
        (item) =>
          item.attachment_type ===
          'OTHER'
      ),
    },
  ]

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Link
              href="/jobs"
              className="text-sm font-semibold text-[#e85d91] hover:underline"
            >
              ← Jobs Register
            </Link>

            <span className="text-slate-300">
              /
            </span>

            <span className="text-sm text-slate-500">
              Job Detail
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-[#4a2633]">
              {job.job_number}
            </h1>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${getPriorityClass(
                job.priority
              )}`}
            >
              {job.priority}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                job.status
              )}`}
            >
              {job.status}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Created {formatDate(job.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/jobs/${job.id}/workflow`}
            className="rounded-xl bg-[#f582ae] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#e85d91]"
          >
            Manage Workflow
          </Link>

          <Link
            href="/jobs"
            className="rounded-xl border border-[#f3dce5] bg-white px-5 py-3 text-sm font-bold text-[#4a2633] hover:bg-pink-50"
          >
            Back to Jobs
          </Link>
        </div>
      </div>

      {/* =====================================================
          KPI SUMMARY
      ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Estimated Cost
          </p>

          <p className="mt-2 text-2xl font-black text-[#4a2633]">
            {formatCurrency(estimatedCost)}
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Actual Cost
          </p>

          <p className="mt-2 text-2xl font-black text-[#4a2633]">
            {formatCurrency(actualCost)}
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Cost Items
          </p>

          <p className="mt-2 text-2xl font-black text-[#4a2633]">
            {(costs || []).length}
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Evidence Files
          </p>

          <p className="mt-2 text-2xl font-black text-[#4a2633]">
            {attachments.length}
          </p>
        </div>
      </div>

      {/* =====================================================
          WORKFLOW
      ===================================================== */}

      <section className="dunkin-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-[#4a2633]">
              Maintenance Workflow
            </h2>

            <p className="text-sm text-slate-500">
              Current position in the maintenance process.
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
              job.status
            )}`}
          >
            {job.status}
          </span>
        </div>

        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex min-w-[1100px] items-center">
            {workflowSteps.map(
              (step, index) => {
                const isCurrent =
                  step === job.status

                const isCompleted =
                  currentStepIndex >= 0 &&
                  index < currentStepIndex

                return (
                  <div
                    key={step}
                    className="flex flex-1 items-center"
                  >
                    <div className="flex min-w-0 flex-col items-center">
                      <div
                        className={[
                          'flex h-9 w-9 items-center justify-center rounded-full text-xs font-black',
                          isCurrent
                            ? 'bg-[#f582ae] text-white ring-4 ring-pink-100'
                            : isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-slate-200 text-slate-500',
                        ].join(' ')}
                      >
                        {isCompleted
                          ? '✓'
                          : index + 1}
                      </div>

                      <span
                        className={[
                          'mt-2 max-w-[100px] text-center text-[10px] font-bold',
                          isCurrent
                            ? 'text-[#e85d91]'
                            : 'text-slate-500',
                        ].join(' ')}
                      >
                        {step}
                      </span>
                    </div>

                    {index <
                      workflowSteps.length -
                        1 && (
                      <div
                        className={[
                          'mx-2 h-1 flex-1 rounded',
                          isCompleted
                            ? 'bg-green-400'
                            : 'bg-slate-200',
                        ].join(' ')}
                      />
                    )}
                  </div>
                )
              }
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          JOB INFORMATION + BRANCH
      ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="dunkin-card p-6 xl:col-span-2">
          <h2 className="text-lg font-black text-[#4a2633]">
            Job Information
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Category
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {job.category}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Reported By
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {job.reported_by || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Reported At
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {formatDate(job.reported_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Due At
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {formatDate(job.due_at)}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Problem Description
              </p>

              <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {job.problem_description}
              </div>
            </div>

            {job.hq_remarks && (
              <div className="md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  HQ Remarks
                </p>

                <div className="mt-2 rounded-xl border border-pink-100 bg-pink-50 p-4 text-sm leading-6 text-slate-700">
                  {job.hq_remarks}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="dunkin-card p-6">
          <h2 className="text-lg font-black text-[#4a2633]">
            Branch
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Branch Code
              </p>

              <p className="mt-1 font-black text-[#4a2633]">
                {branch?.branch_code || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Branch Name
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {branch?.branch_name || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Location
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {branch?.address || '-'}
                {branch?.city
                  ? `, ${branch.city}`
                  : ''}
                {branch?.state
                  ? `, ${branch.state}`
                  : ''}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* =====================================================
          ASSET + CONTRACTOR
      ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="dunkin-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#4a2633]">
              Asset
            </h2>

            {asset?.asset_code &&
              job.asset_id && (
                <Link
                  href={`/assets/${job.asset_id}`}
                  className="text-sm font-bold text-[#e85d91] hover:underline"
                >
                  View Asset
                </Link>
              )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Asset Code
              </p>

              <p className="mt-1 font-black text-[#4a2633]">
                {asset?.asset_code || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Asset Name
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {asset?.asset_name || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Category
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {asset?.asset_category || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Serial Number
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {asset?.serial_number || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Manufacturer
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {asset?.manufacturer || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Model
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {asset?.model || '-'}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Warranty Expiry
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {formatDateOnly(
                  asset?.warranty_expiry ||
                    null
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="dunkin-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#4a2633]">
              Assigned Contractor
            </h2>

            {contractor?.contractor_code &&
              job.contractor_id && (
                <Link
                  href={`/contractors/${job.contractor_id}`}
                  className="text-sm font-bold text-[#e85d91] hover:underline"
                >
                  View Contractor
                </Link>
              )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Contractor Code
              </p>

              <p className="mt-1 font-black text-[#4a2633]">
                {contractor?.contractor_code ||
                  '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Company
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {contractor?.company_name ||
                  '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Contact Person
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {contractor?.contact_person ||
                  '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Phone
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {contractor?.contact_phone ||
                  '-'}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Email
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {contractor?.contact_email ||
                  '-'}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* =====================================================
          TECHNICIAN / SITE VISIT
      ===================================================== */}

      <section className="dunkin-card p-6">
        <h2 className="text-lg font-black text-[#4a2633]">
          Technician & Site Visit
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Technician
            </p>

            <p className="mt-1 font-bold text-slate-800">
              {job.technician_name || '-'}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Technician Phone
            </p>

            <p className="mt-1 font-bold text-slate-800">
              {job.technician_phone || '-'}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Scheduled Visit
            </p>

            <p className="mt-1 font-bold text-slate-800">
              {formatDate(
                job.scheduled_at
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Arrival
            </p>

            <p className="mt-1 font-bold text-slate-800">
              {formatDate(
                job.arrived_at
              )}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          DIAGNOSIS + WORK PERFORMED
      ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="dunkin-card p-6">
          <h2 className="text-lg font-black text-[#4a2633]">
            Diagnosis
          </h2>

          <div className="mt-4 min-h-[120px] rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {job.diagnosis || (
              <span className="text-slate-400">
                Diagnosis has not been submitted yet.
              </span>
            )}
          </div>
        </section>

        <section className="dunkin-card p-6">
          <h2 className="text-lg font-black text-[#4a2633]">
            Work Performed
          </h2>

          <div className="mt-4 min-h-[120px] rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {job.work_performed || (
              <span className="text-slate-400">
                Work details have not been submitted yet.
              </span>
            )}
          </div>
        </section>
      </div>

      {/* =====================================================
          CONTRACTOR EVIDENCE
      ===================================================== */}

      <section className="dunkin-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#4a2633]">
              Contractor Evidence
            </h2>

            <p className="text-sm text-slate-500">
              Photos and documents submitted by the assigned contractor.
            </p>
          </div>

          <div className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">
            {attachments.length}{' '}
            {attachments.length === 1
              ? 'file'
              : 'files'}
          </div>
        </div>

        {attachments.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="text-3xl">
              📷
            </div>

            <p className="mt-3 text-sm font-bold text-slate-600">
              No contractor evidence uploaded yet.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Evidence uploaded by the contractor will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {evidenceGroups.map(
              ({ type, files }) => {
                if (!files.length) {
                  return null
                }

                return (
                  <div key={type}>
                    <div className="mb-4 flex items-center gap-3">
                      <h3 className="text-sm font-black uppercase tracking-wide text-[#4a2633]">
                        {getEvidenceLabel(type)}
                      </h3>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                        {files.length}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {files.map(
                        (attachment) => {
                          const image =
                            isImage(
                              attachment.file_type
                            )

                          return (
                            <div
                              key={attachment.id}
                              className="overflow-hidden rounded-xl border border-[#f3dce5] bg-white shadow-sm"
                            >
                              {image &&
                              attachment.signedUrl ? (
                                <a
                                  href={
                                    attachment.signedUrl
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block aspect-video overflow-hidden bg-slate-100"
                                >
                                  <img
                                    src={
                                      attachment.signedUrl
                                    }
                                    alt={
                                      attachment.file_name
                                    }
                                    className="h-full w-full object-cover transition duration-200 hover:scale-105"
                                  />
                                </a>
                              ) : (
                                <div className="flex aspect-video items-center justify-center bg-slate-50">
                                  <div className="text-center">
                                    <div className="text-4xl">
                                      📄
                                    </div>

                                    <p className="mt-2 text-xs font-black text-slate-600">
                                      Document
                                    </p>
                                  </div>
                                </div>
                              )}

                              <div className="p-4">
                                <p
                                  className="truncate text-sm font-black text-[#4a2633]"
                                  title={
                                    attachment.file_name
                                  }
                                >
                                  {
                                    attachment.file_name
                                  }
                                </p>

                                <div className="mt-2 space-y-1">
                                  <p className="text-xs text-slate-500">
                                    Uploaded by{' '}
                                    <span className="font-semibold">
                                      {attachment.uploaded_by ||
                                        'Contractor'}
                                    </span>
                                  </p>

                                  <p className="text-xs text-slate-400">
                                    {formatDate(
                                      attachment.uploaded_at
                                    )}
                                  </p>

                                  <p className="text-xs text-slate-400">
                                    {formatFileSize(
                                      attachment.file_size
                                    )}
                                  </p>
                                </div>

                                {attachment.signedUrl ? (
                                  <a
                                    href={
                                      attachment.signedUrl
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#f582ae] px-3 py-2 text-xs font-black text-white transition hover:bg-[#e85d91]"
                                  >
                                    {image
                                      ? 'View Full Image'
                                      : 'Open Document'}
                                  </a>
                                ) : (
                                  <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-600">
                                    File unavailable
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          JOB COSTS
      ===================================================== */}

      <section className="dunkin-card overflow-hidden">
        <div className="border-b border-[#f3dce5] p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#4a2633]">
                Job Costs
              </h2>

              <p className="text-sm text-slate-500">
                Detailed cost breakdown for this maintenance job.
              </p>
            </div>

            <p className="text-lg font-black text-[#4a2633]">
              {formatCurrency(totalCost)}
            </p>
          </div>
        </div>

        {(costs || []).length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No cost items recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Description
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                    Qty
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                    Unit Price
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(costs || []).map(
                  (item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {item.cost_type}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {item.description}
                      </td>

                      <td className="px-6 py-4 text-right text-slate-600">
                        {item.quantity}
                      </td>

                      <td className="px-6 py-4 text-right text-slate-600">
                        {formatCurrency(
                          Number(
                            item.unit_price || 0
                          )
                        )}
                      </td>

                      <td className="px-6 py-4 text-right font-black text-[#4a2633]">
                        {formatCurrency(
                          Number(
                            item.amount || 0
                          )
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          QUOTATIONS
      ===================================================== */}

      <section className="dunkin-card overflow-hidden">
        <div className="border-b border-[#f3dce5] p-6">
          <h2 className="text-lg font-black text-[#4a2633]">
            Quotations
          </h2>

          <p className="text-sm text-slate-500">
            Contractor quotation records associated with this job.
          </p>
        </div>

        {(quotations || []).length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No quotation submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Quotation
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Date
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                    Subtotal
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                    SST
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                    Total
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(quotations || []).map(
                  (quotation) => (
                    <tr key={quotation.id}>
                      <td className="px-6 py-4">
                        <p className="font-black text-[#4a2633]">
                          {quotation.quotation_number ||
                            'Quotation'}
                        </p>

                        {quotation.remarks && (
                          <p className="mt-1 max-w-xs text-xs text-slate-500">
                            {quotation.remarks}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {quotation.quotation_date
                          ? formatDateOnly(
                              quotation.quotation_date
                            )
                          : '-'}
                      </td>

                      <td className="px-6 py-4 text-right text-slate-600">
                        {formatCurrency(
                          Number(
                            quotation.subtotal ||
                              0
                          )
                        )}
                      </td>

                      <td className="px-6 py-4 text-right text-slate-600">
                        {formatCurrency(
                          Number(
                            quotation.sst_amount ||
                              0
                          )
                        )}
                      </td>

                      <td className="px-6 py-4 text-right font-black text-[#4a2633]">
                        {formatCurrency(
                          Number(
                            quotation.total_amount ||
                              0
                          )
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          {quotation.status}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          ACTIVITY TIMELINE
      ===================================================== */}

      <section className="dunkin-card p-6">
        <h2 className="text-lg font-black text-[#4a2633]">
          Activity Timeline
        </h2>

        <p className="text-sm text-slate-500">
          Recorded job status changes and activity.
        </p>

        {(updates || []).length === 0 ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">
            No activity recorded yet.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {(updates || []).map(
              (update, index) => (
                <div
                  key={update.id}
                  className="relative flex gap-4"
                >
                  {index <
                    (updates || []).length -
                      1 && (
                    <div className="absolute left-[9px] top-7 h-full w-px bg-slate-200" />
                  )}

                  <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f582ae] text-[10px] font-black text-white">
                    ✓
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-bold text-slate-800">
                        {update.old_status &&
                        update.new_status
                          ? `${update.old_status} → ${update.new_status}`
                          : update.update_type}
                      </p>

                      <p className="text-xs text-slate-400">
                        {formatDate(
                          update.updated_at
                        )}
                      </p>
                    </div>

                    {update.remarks && (
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {update.remarks}
                      </p>
                    )}

                    {update.updated_by && (
                      <p className="mt-1 text-xs text-slate-400">
                        By {update.updated_by}
                      </p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          COMPLETION & VERIFICATION
      ===================================================== */}

      <section className="dunkin-card p-6">
        <h2 className="text-lg font-black text-[#4a2633]">
          Completion & Verification
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Accepted
            </p>

            <p className="mt-1 font-bold text-slate-800">
              {formatDate(
                job.accepted_at
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Completed
            </p>

            <p className="mt-1 font-bold text-slate-800">
              {formatDate(
                job.completed_at
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Branch Verified
            </p>

            <p className="mt-1 font-bold text-slate-800">
              {formatDate(
                job.branch_verified_at
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Closed
            </p>

            <p className="mt-1 font-bold text-slate-800">
              {formatDate(
                job.closed_at
              )}
            </p>
          </div>
        </div>

        {job.branch_remarks && (
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Branch Remarks
            </p>

            <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {job.branch_remarks}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
