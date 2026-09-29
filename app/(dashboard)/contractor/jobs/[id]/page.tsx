import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContractorJobWorkflow from '@/components/contractor/ContractorJobWorkflow'

type PageProps = {
  params: Promise<{ id: string }>
}

type Branch = {
  branch_name: string
  branch_code: string
  address: string | null
  city: string | null
  state: string | null
}

type Asset = {
  asset_code: string
  asset_name: string
  asset_category: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
}

type Contractor = {
  contractor_code: string
  company_name: string
  contact_person: string | null
  contact_phone: string | null
}

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
  scheduled_at: string | null
  technician_name: string | null
  technician_phone: string | null
  diagnosis: string | null
  work_performed: string | null
  hq_remarks: string | null
  estimated_cost: number | null
  actual_cost: number | null
  branches: Branch | null
  assets: Asset | null
  contractors: Contractor | null
}

type Quotation = {
  id: string
  quotation_number: string | null
  status: string
  quotation_date: string | null
  total_amount: number | null
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function money(value: number | null) {
  return `RM ${Number(value ?? 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function statusClass(status: string) {
  if (['COMPLETED', 'CLOSED', 'APPROVED'].includes(status)) {
    return 'bg-green-100 text-green-700'
  }
  if (['CRITICAL', 'CANCELLED'].includes(status)) {
    return 'bg-red-100 text-red-700'
  }
  if (['HIGH', 'REPAIR'].includes(status)) {
    return 'bg-orange-100 text-orange-700'
  }
  return 'bg-slate-100 text-slate-700'
}

export default async function ContractorJobDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, contractor_id, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (
    !profile ||
    profile.role !== 'CONTRACTOR' ||
    !profile.is_active ||
    !profile.contractor_id
  ) {
    notFound()
  }

  const { data: rawJob, error: jobError } = await supabase
    .from('maintenance_jobs')
    .select(`
      id,
      job_number,
      category,
      priority,
      status,
      problem_description,
      reported_by,
      reported_at,
      due_at,
      scheduled_at,
      technician_name,
      technician_phone,
      diagnosis,
      work_performed,
      hq_remarks,
      estimated_cost,
      actual_cost,
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
        serial_number
      ),
      contractors (
        contractor_code,
        company_name,
        contact_person,
        contact_phone
      )
    `)
    .eq('id', id)
    .eq('contractor_id', profile.contractor_id)
    .maybeSingle()

  if (jobError || !rawJob) notFound()

  const job: Job = {
    ...rawJob,
    branches: first(rawJob.branches) as Branch | null,
    assets: first(rawJob.assets) as Asset | null,
    contractors: first(rawJob.contractors) as Contractor | null,
    estimated_cost:
      rawJob.estimated_cost === null
        ? null
        : Number(rawJob.estimated_cost),
    actual_cost:
      rawJob.actual_cost === null
        ? null
        : Number(rawJob.actual_cost),
  }

  const { data: rawQuotations } = await supabase
    .from('quotations')
    .select(
      'id, quotation_number, status, quotation_date, total_amount'
    )
    .eq('job_id', job.id)
    .order('created_at', { ascending: false })

  const quotations: Quotation[] = (rawQuotations ?? []).map((quotation) => ({
    ...quotation,
    total_amount:
      quotation.total_amount === null
        ? null
        : Number(quotation.total_amount),
  }))

  const branch = job.branches
  const asset = job.assets

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link
            href="/contractor/jobs"
            className="text-sm font-semibold text-[#e85d91] hover:underline"
          >
            ← Back to Assigned Jobs
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-[#f582ae]">
            Contractor Portal
          </p>
          <h1 className="mt-1 text-3xl font-black text-[#4a2633]">
            {job.job_number}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Assigned maintenance job · {job.category}
          </p>
        </div>

        <span className={`rounded-full px-4 py-2 text-sm font-black ${statusClass(job.status)}`}>
          {job.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="dunkin-card p-6 lg:col-span-2">
          <h2 className="text-lg font-black text-[#4a2633]">Job Information</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Priority</p>
              <p className="mt-1 font-bold text-slate-800">{job.priority}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Category</p>
              <p className="mt-1 font-bold text-slate-800">{job.category}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Reported By</p>
              <p className="mt-1 text-slate-800">{job.reported_by || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Reported At</p>
              <p className="mt-1 text-slate-800">{formatDate(job.reported_at)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Due At</p>
              <p className="mt-1 text-slate-800">{formatDate(job.due_at)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Scheduled At</p>
              <p className="mt-1 text-slate-800">{formatDate(job.scheduled_at)}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-[#f3dce5] pt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Problem Description</p>
            <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
              {job.problem_description || '-'}
            </p>
          </div>
        </section>

        <section className="dunkin-card p-6">
          <h2 className="text-lg font-black text-[#4a2633]">Branch</h2>
          <div className="mt-5 space-y-3 text-sm">
            <p className="font-black text-slate-800">{branch?.branch_name || '-'}</p>
            <p className="text-slate-500">{branch?.branch_code || '-'}</p>
            <p className="whitespace-pre-wrap text-slate-600">
              {[branch?.address, branch?.city, branch?.state].filter(Boolean).join(', ') || '-'}
            </p>
          </div>

          <div className="mt-6 border-t border-[#f3dce5] pt-6">
            <h3 className="font-black text-[#4a2633]">Asset</h3>
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-bold text-slate-800">{asset?.asset_name || '-'}</p>
              <p className="text-slate-500">{asset?.asset_code || '-'}</p>
              <p className="text-slate-500">{asset?.asset_category || '-'}</p>
              <p className="text-slate-500">
                {[asset?.manufacturer, asset?.model].filter(Boolean).join(' · ') || '-'}
              </p>
              <p className="text-slate-500">Serial: {asset?.serial_number || '-'}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="dunkin-card p-6">
        <h2 className="text-lg font-black text-[#4a2633]">Work Information</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Technician</p>
            <p className="mt-2 text-slate-800">{job.technician_name || '-'}</p>
            <p className="text-sm text-slate-500">{job.technician_phone || ''}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Diagnosis</p>
            <p className="mt-2 whitespace-pre-wrap text-slate-700">{job.diagnosis || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Work Performed</p>
            <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">{job.work_performed || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">HQ Remarks</p>
            <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">{job.hq_remarks || '-'}</p>
          </div>
        </div>
      </section>

      <ContractorJobWorkflow
        jobId={job.id}
        contractorId={profile.contractor_id}
        initialStatus={job.status}
        initialTechnicianName={job.technician_name}
        initialTechnicianPhone={job.technician_phone}
        initialScheduledAt={job.scheduled_at}
        initialDiagnosis={job.diagnosis}
        initialWorkPerformed={job.work_performed}
      />

      <section className="dunkin-card p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-black text-[#4a2633]">Quotations</h2>
            <p className="mt-1 text-sm text-slate-500">
              Quotations belonging to this contractor and maintenance job.
            </p>
          </div>
          <Link
            href="/finance/quotations"
            className="rounded-xl border border-[#ead4dd] px-4 py-2 text-sm font-bold text-[#4a2633] hover:bg-[#fff8fa]"
          >
            Open Quotations
          </Link>
        </div>

        {quotations.length === 0 ? (
          <div className="mt-5 rounded-xl bg-[#fff8fa] p-5 text-sm text-slate-500">
            No quotation has been recorded for this job yet.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#fff8fa] text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Quotation</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3dce5]">
                {quotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td className="px-4 py-4 font-bold text-[#4a2633]">
                      {quotation.quotation_number || quotation.id}
                    </td>
                    <td className="px-4 py-4">{quotation.quotation_date || '-'}</td>
                    <td className="px-4 py-4">{money(quotation.total_amount)}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(quotation.status)}`}>
                        {quotation.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="dunkin-card p-5">
          <p className="text-sm text-slate-500">Estimated Cost</p>
          <p className="mt-2 text-2xl font-black text-[#4a2633]">{money(job.estimated_cost)}</p>
        </div>
        <div className="dunkin-card p-5">
          <p className="text-sm text-slate-500">Actual Cost</p>
          <p className="mt-2 text-2xl font-black text-[#4a2633]">{money(job.actual_cost)}</p>
        </div>
        <div className="dunkin-card p-5">
          <p className="text-sm text-slate-500">Assigned Contractor</p>
          <p className="mt-2 font-black text-[#4a2633]">{job.contractors?.company_name || '-'}</p>
          <p className="text-sm text-slate-500">{job.contractors?.contractor_code || ''}</p>
        </div>
      </section>
    </div>
  )
}
