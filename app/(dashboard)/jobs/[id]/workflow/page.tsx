'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

const statusOptions = [
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
  'ON HOLD',
  'CANCELLED',
]

export default function WorkflowPage() {
  const params = useParams()
  const router = useRouter()

  const id = params.id as string

  const [job, setJob] = useState<any>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [contractors, setContractors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [status, setStatus] = useState('')
  const [contractorId, setContractorId] = useState('')
  const [technicianName, setTechnicianName] = useState('')
  const [technicianPhone, setTechnicianPhone] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [workPerformed, setWorkPerformed] = useState('')
  const [hqRemarks, setHqRemarks] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (!profile?.is_active || !['HQ_ADMIN', 'HQ_MAINTENANCE'].includes(profile.role)) {
      router.push('/unauthorized')
      return
    }

    setCanEdit(true)

    const { data: jobData, error: jobError } = await supabase
      .from('maintenance_jobs')
      .select(`
        *,
        branches (
          branch_name,
          branch_code
        ),
        assets (
          asset_name,
          asset_code
        ),
        contractors (
          company_name,
          contractor_code
        )
      `)
      .eq('id', id)
      .single()

    if (jobError) {
      setMessage(jobError.message)
      setLoading(false)
      return
    }

    const { data: contractorData } = await supabase
      .from('contractors')
      .select('*')
      .eq('is_active', true)
      .order('company_name')

    setJob(jobData)
    setContractors(contractorData ?? [])

    setStatus(jobData.status ?? 'NEW')
    setContractorId(jobData.contractor_id ?? '')
    setTechnicianName(jobData.technician_name ?? '')
    setTechnicianPhone(jobData.technician_phone ?? '')
    setScheduledAt(
      jobData.scheduled_at
        ? new Date(jobData.scheduled_at)
            .toISOString()
            .slice(0, 16)
        : ''
    )
    setDiagnosis(jobData.diagnosis ?? '')
    setWorkPerformed(jobData.work_performed ?? '')
    setHqRemarks(jobData.hq_remarks ?? '')

    setLoading(false)
  }

  async function saveWorkflow() {
    if (!job || !canEdit) return

    setSaving(true)
    setMessage('')

    const oldStatus = job.status

    const now = new Date().toISOString()

    const updateData: any = {
      status,
      contractor_id: contractorId || null,
      technician_name: technicianName || null,
      technician_phone: technicianPhone || null,
      scheduled_at: scheduledAt
        ? new Date(scheduledAt).toISOString()
        : null,
      diagnosis: diagnosis || null,
      work_performed: workPerformed || null,
      hq_remarks: hqRemarks || null,
      updated_at: now,
    }

    if (contractorId && contractorId !== job.contractor_id) {
      updateData.assigned_at = now
    }

    if (status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
      updateData.completed_at = now
    }

    if (
      status === 'BRANCH VERIFICATION' &&
      oldStatus !== 'BRANCH VERIFICATION'
    ) {
      updateData.branch_verified_at = now
    }

    if (status === 'CLOSED' && oldStatus !== 'CLOSED') {
      updateData.closed_at = now
    }

    const { error: updateError } = await supabase
      .from('maintenance_jobs')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      setMessage(updateError.message)
      setSaving(false)
      return
    }

    if (status !== oldStatus) {
      const { data: userData } = await supabase.auth.getUser()

      const updatedBy =
        userData.user?.email ?? 'HQ User'

      const { error: auditError } = await supabase
        .from('job_updates')
        .insert({
          job_id: id,
          update_type: 'STATUS_CHANGE',
          old_status: oldStatus,
          new_status: status,
          remarks: hqRemarks || null,
          updated_by: updatedBy,
        })

      if (auditError) {
        console.error('Audit error:', auditError)
      }
    }

    setMessage('Workflow updated successfully.')

    await loadData()

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-[#4a2633]">
          Loading Workflow...
        </h1>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-bold text-red-700">
          Unable to load maintenance job.
        </p>

        <p className="mt-2 text-sm text-red-600">
          {message}
        </p>
      </div>
    )
  }

  const currentStep = workflowSteps.indexOf(job.status)

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <button
            onClick={() => router.push(`/jobs/${id}`)}
            className="text-sm font-semibold text-[#e85d91] hover:underline"
          >
            ← Back to Job Detail
          </button>

          <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-[#f58220]">
            DUNKIN' MAINTENANCE
          </p>

          <h1 className="mt-1 text-3xl font-black text-[#4a2633]">
            Manage Workflow
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {job.job_number} · {job.branches?.branch_name}
          </p>
        </div>
      </div>

      {/* WORKFLOW PROGRESS */}
      <div className="dunkin-card overflow-hidden">
        <div className="border-b border-[#f3dce5] px-6 py-5">
          <h2 className="text-lg font-black text-[#4a2633]">
            Workflow Progress
          </h2>
        </div>

        <div className="overflow-x-auto p-6">
          <div className="flex min-w-[1000px] items-center">

            {workflowSteps.map((step, index) => {
              const completed =
                index <= currentStep

              const current =
                index === currentStep

              return (
                <div
                  key={step}
                  className="flex flex-1 items-center"
                >

                  <div className="flex flex-col items-center text-center">

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-black ${
                        completed
                          ? 'bg-[#f582ae] text-white'
                          : 'bg-slate-100 text-slate-400'
                      } ${
                        current
                          ? 'ring-4 ring-[#fce1eb]'
                          : ''
                      }`}
                    >
                      {index + 1}
                    </div>

                    <p
                      className={`mt-2 max-w-[90px] text-[10px] font-bold ${
                        completed
                          ? 'text-[#4a2633]'
                          : 'text-slate-400'
                      }`}
                    >
                      {step}
                    </p>

                  </div>

                  {index <
                    workflowSteps.length - 1 && (
                    <div
                      className={`mx-2 h-1 flex-1 rounded ${
                        index < currentStep
                          ? 'bg-[#f582ae]'
                          : 'bg-slate-100'
                      }`}
                    />
                  )}

                </div>
              )
            })}

          </div>
        </div>
      </div>

      {/* WORKFLOW FORM */}
      <div className="dunkin-card p-6">

        <div className="border-b border-[#f3dce5] pb-5">
          <h2 className="text-lg font-black text-[#4a2633]">
            Update Maintenance Job
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Update the current maintenance activity and workflow status.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">

          {/* STATUS */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Job Status
            </label>

            <select
              disabled={!canEdit}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* CONTRACTOR */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Contractor
            </label>

            <select
              disabled={!canEdit}
              value={contractorId}
              onChange={(e) =>
                setContractorId(e.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="">
                Unassigned
              </option>

              {contractors.map((contractor) => (
                <option
                  key={contractor.id}
                  value={contractor.id}
                >
                  {contractor.company_name} (
                  {contractor.contractor_code})
                </option>
              ))}
            </select>
          </div>

          {/* TECHNICIAN */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Technician Name
            </label>

            <input
              type="text"
              disabled={!canEdit}
              value={technicianName}
              onChange={(e) =>
                setTechnicianName(e.target.value)
              }
              placeholder="Technician name"
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>

          {/* PHONE */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Technician Phone
            </label>

            <input
              type="text"
              disabled={!canEdit}
              value={technicianPhone}
              onChange={(e) =>
                setTechnicianPhone(e.target.value)
              }
              placeholder="012-3456789"
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>

          {/* SCHEDULE */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Scheduled Visit
            </label>

            <input
              type="datetime-local"
              disabled={!canEdit}
              value={scheduledAt}
              onChange={(e) =>
                setScheduledAt(e.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>

          {/* DIAGNOSIS */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Diagnosis
            </label>

            <textarea
              disabled={!canEdit}
              value={diagnosis}
              onChange={(e) =>
                setDiagnosis(e.target.value)
              }
              rows={4}
              placeholder="Enter technician diagnosis..."
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>

          {/* WORK */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Work Performed
            </label>

            <textarea
              disabled={!canEdit}
              value={workPerformed}
              onChange={(e) =>
                setWorkPerformed(e.target.value)
              }
              rows={4}
              placeholder="Describe repair or maintenance work performed..."
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>

          {/* HQ REMARKS */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              HQ Remarks
            </label>

            <textarea
              disabled={!canEdit}
              value={hqRemarks}
              onChange={(e) =>
                setHqRemarks(e.target.value)
              }
              rows={3}
              placeholder="Internal HQ maintenance remarks..."
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>

        </div>

        {/* SAVE */}
        <div className="mt-6 flex flex-col justify-between gap-4 border-t border-[#f3dce5] pt-6 sm:flex-row sm:items-center">

          {message ? (
            <p className="text-sm font-semibold text-green-600">
              {message}
            </p>
          ) : (
            <div />
          )}

          <button
            onClick={saveWorkflow}
            disabled={saving || !canEdit}
            className="rounded-xl bg-[#f582ae] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#e85d91] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : 'Save Workflow Update'}
          </button>

        </div>

      </div>

      {/* JOB SUMMARY */}
      <div className="grid gap-6 md:grid-cols-3">

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Branch
          </p>

          <p className="mt-2 font-bold text-[#4a2633]">
            {job.branches?.branch_name ?? '-'}
          </p>

          <p className="text-xs text-slate-400">
            {job.branches?.branch_code ?? ''}
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Asset
          </p>

          <p className="mt-2 font-bold text-[#4a2633]">
            {job.assets?.asset_name ?? '-'}
          </p>

          <p className="text-xs text-slate-400">
            {job.assets?.asset_code ?? ''}
          </p>
        </div>

        <div className="dunkin-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Priority
          </p>

          <p className="mt-2 font-bold text-red-600">
            {job.priority}
          </p>
        </div>

      </div>

    </div>
  )
}