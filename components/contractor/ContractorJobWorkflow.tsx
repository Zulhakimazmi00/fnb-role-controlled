"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CONTRACTOR_STATUSES = [
  'ASSIGNED',
  'ACCEPTED',
  'SITE VISIT',
  'DIAGNOSIS',
  'QUOTATION SUBMITTED',
  'REPAIR',
  'COMPLETED',
  'ON HOLD',
]

const EVIDENCE_TYPES = ['BEFORE WORK', 'DURING WORK', 'AFTER WORK']

export default function ContractorJobWorkflow({
  jobId,
  contractorId,
  initialStatus,
  initialTechnicianName,
  initialTechnicianPhone,
  initialScheduledAt,
  initialDiagnosis,
  initialWorkPerformed,
}: {
  jobId: string
  contractorId: string
  initialStatus: string
  initialTechnicianName: string | null
  initialTechnicianPhone: string | null
  initialScheduledAt: string | null
  initialDiagnosis: string | null
  initialWorkPerformed: string | null
}) {
  const supabase = createClient()
  const [status, setStatus] = useState(initialStatus)
  const [technicianName, setTechnicianName] = useState(initialTechnicianName ?? '')
  const [technicianPhone, setTechnicianPhone] = useState(initialTechnicianPhone ?? '')
  const [scheduledAt, setScheduledAt] = useState(
    initialScheduledAt ? new Date(initialScheduledAt).toISOString().slice(0, 16) : ''
  )
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis ?? '')
  const [workPerformed, setWorkPerformed] = useState(initialWorkPerformed ?? '')
  const [evidenceType, setEvidenceType] = useState('BEFORE WORK')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function saveWorkflow() {
    setSaving(true)
    setMessage('')
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('Your session has expired. Please sign in again.')
      setSaving(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, contractor_id, is_active')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (
      !profile ||
      profile.role !== 'CONTRACTOR' ||
      !profile.is_active ||
      profile.contractor_id !== contractorId
    ) {
      setError('You are not authorized to update this job.')
      setSaving(false)
      return
    }

    const { data: currentJob, error: currentJobError } = await supabase
      .from('maintenance_jobs')
      .select('status, contractor_id')
      .eq('id', jobId)
      .maybeSingle()

    if (currentJobError || !currentJob || currentJob.contractor_id !== contractorId) {
      setError('This job is no longer assigned to your contractor account.')
      setSaving(false)
      return
    }

    const now = new Date().toISOString()
    const updateData: Record<string, string | null> = {
      status,
      technician_name: technicianName.trim() || null,
      technician_phone: technicianPhone.trim() || null,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      diagnosis: diagnosis.trim() || null,
      work_performed: workPerformed.trim() || null,
      updated_at: now,
    }

    if (status === 'COMPLETED' && currentJob.status !== 'COMPLETED') {
      updateData.completed_at = now
    }

    const { error: updateError } = await supabase
      .from('maintenance_jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('contractor_id', contractorId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    if (status !== currentJob.status) {
      await supabase.from('job_updates').insert({
        job_id: jobId,
        update_type: 'CONTRACTOR_WORKFLOW',
        old_status: currentJob.status,
        new_status: status,
        remarks: workPerformed.trim() || diagnosis.trim() || null,
        updated_by: userData.user.email ?? 'Contractor',
      })
    }

    setMessage('Workflow updated successfully.')
    setSaving(false)
  }

  async function uploadEvidence() {
    if (!file) {
      setError('Select a photo first.')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Only image files can be uploaded as work evidence.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Each photo must be 10 MB or smaller.')
      return
    }

    setUploading(true)
    setMessage('')
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('Your session has expired. Please sign in again.')
      setUploading(false)
      return
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `jobs/${jobId}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('maintenance-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { error: attachmentError } = await supabase
      .from('job_attachments')
      .insert({
        job_id: jobId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        attachment_type: evidenceType,
        uploaded_by: userData.user.email ?? 'Contractor',
      })

    if (attachmentError) {
      await supabase.storage.from('maintenance-files').remove([filePath])
      setError(attachmentError.message)
      setUploading(false)
      return
    }

    setFile(null)
    setMessage('Work evidence uploaded successfully.')
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      <section className="dunkin-card p-6">
        <div className="border-b border-[#f3dce5] pb-5">
          <h2 className="text-lg font-black text-[#4a2633]">Update Work Workflow</h2>
          <p className="mt-1 text-sm text-slate-500">
            Update only the work information belonging to your assigned maintenance job.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold text-slate-600">
            Workflow Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm">
              {CONTRACTOR_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-600">
            Technician Name
            <input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#f3dce5] px-4 py-3 text-sm" />
          </label>
          <label className="text-sm font-bold text-slate-600">
            Technician Phone
            <input value={technicianPhone} onChange={(e) => setTechnicianPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[#f3dce5] px-4 py-3 text-sm" />
          </label>
          <label className="text-sm font-bold text-slate-600">
            Scheduled Visit
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-2 w-full rounded-xl border border-[#f3dce5] px-4 py-3 text-sm" />
          </label>
          <label className="text-sm font-bold text-slate-600 md:col-span-2">
            Diagnosis
            <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-[#f3dce5] px-4 py-3 text-sm" />
          </label>
          <label className="text-sm font-bold text-slate-600 md:col-span-2">
            Work Performed
            <textarea value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-[#f3dce5] px-4 py-3 text-sm" />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#f3dce5] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className={error ? 'text-sm font-semibold text-red-600' : 'text-sm font-semibold text-green-600'}>{error || message}</p>
          <button onClick={saveWorkflow} disabled={saving} className="rounded-xl bg-[#f582ae] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Work Update'}
          </button>
        </div>
      </section>

      <section className="dunkin-card p-6">
        <div className="border-b border-[#f3dce5] pb-5">
          <h2 className="text-lg font-black text-[#4a2633]">Work Evidence Photos</h2>
          <p className="mt-1 text-sm text-slate-500">Upload before, during, and after-work photos for HQ review.</p>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-600">
            Evidence Stage
            <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className="mt-2 w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm">
              {EVIDENCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-600 md:col-span-2">
            Photo
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm" />
            <span className="mt-1 block text-xs text-slate-400">Image only · maximum 10 MB</span>
          </label>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">{file?.name || 'No photo selected.'}</p>
          <button onClick={uploadEvidence} disabled={uploading || !file} className="rounded-xl border border-[#e85d91] px-6 py-3 text-sm font-bold text-[#e85d91] disabled:cursor-not-allowed disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload Evidence Photo'}
          </button>
        </div>
      </section>
    </div>
  )
}
