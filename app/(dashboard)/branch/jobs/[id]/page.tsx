'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  arrived_at: string | null
  diagnosis: string | null
  work_performed: string | null
  completed_at: string | null
  branch_verified_at: string | null
  branch_remarks: string | null
  hq_remarks: string | null
  technician_name: string | null
  technician_phone: string | null
  branch_id: string
  asset_id: string | null
  contractor_id: string | null
  branches:
    | {
        branch_code: string
        branch_name: string
      }
    | null
  assets:
    | {
        asset_code: string
        asset_name: string
        asset_category: string
        manufacturer: string | null
        model: string | null
        serial_number: string | null
      }
    | null
  contractors:
    | {
        contractor_code: string
        company_name: string
        contact_phone: string | null
      }
    | null
}

type JobUpdate = {
  id: string
  old_status: string | null
  new_status: string | null
  remarks: string | null
  updated_by: string | null
  updated_at: string
}

export default function BranchJobDetailPage() {
  const params = useParams()
  const id = params.id as string

  const supabase = createClient()

  const [job, setJob] = useState<Job | null>(null)
  const [updates, setUpdates] = useState<JobUpdate[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [branchRemarks, setBranchRemarks] = useState('')

  const [showVerification, setShowVerification] =
    useState(false)

  useEffect(() => {
    if (id) {
      loadJob()
    }
  }, [id])

  async function loadJob() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error(
          'Your session has expired. Please log in again.'
        )
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('branch_id, role, is_active')
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

      if (profile.role !== 'BRANCH_USER') {
        throw new Error(
          'This page is only available to Branch Users.'
        )
      }

      if (!profile.is_active) {
        throw new Error('Your account is inactive.')
      }

      if (!profile.branch_id) {
        throw new Error(
          'Your account has not been assigned to a branch.'
        )
      }

      const { data: jobData, error: jobError } =
        await supabase
          .from('maintenance_jobs')
          .select(
            '*, branches(branch_code, branch_name), assets(asset_code, asset_name, asset_category, manufacturer, model, serial_number), contractors(contractor_code, company_name, contact_phone)'
          )
          .eq('id', id)
          .eq('branch_id', profile.branch_id)
          .maybeSingle()

      if (jobError) {
        throw new Error(jobError.message)
      }

      if (!jobData) {
        throw new Error(
          'Maintenance job not found or you do not have access to it.'
        )
      }

      const { data: updateData, error: updateError } =
        await supabase
          .from('job_updates')
          .select(
            'id, old_status, new_status, remarks, updated_by, updated_at'
          )
          .eq('job_id', id)
          .order('updated_at', { ascending: false })

      if (updateError) {
        throw new Error(updateError.message)
      }

      setJob(jobData as Job)
      setUpdates((updateData as JobUpdate[]) || [])
      setBranchRemarks(jobData.branch_remarks || '')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load maintenance job.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function submitVerification(
    verified: boolean
  ) {
    if (!job) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'Your session has expired. Please log in again.'
        )
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('branch_id, role, is_active, full_name')
          .eq('id', user.id)
          .maybeSingle()

      if (profileError) {
        throw new Error(profileError.message)
      }

      if (
        !profile ||
        profile.role !== 'BRANCH_USER' ||
        !profile.is_active ||
        profile.branch_id !== job.branch_id
      ) {
        throw new Error(
          'You are not authorized to verify this job.'
        )
      }

      if (job.status !== 'BRANCH VERIFICATION') {
        throw new Error(
          'This job is not currently awaiting branch verification.'
        )
      }

      if (!branchRemarks.trim()) {
        throw new Error(
          'Please provide branch remarks before submitting verification.'
        )
      }

      if (verified) {
        const { error: updateError } =
          await supabase
            .from('maintenance_jobs')
            .update({
              status: 'CLOSED',
              branch_remarks: branchRemarks.trim(),
              branch_verified_at:
                new Date().toISOString(),
              closed_at: new Date().toISOString(),
            })
            .eq('id', job.id)
            .eq('branch_id', profile.branch_id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        await supabase.from('job_updates').insert({
          job_id: job.id,
          update_type: 'BRANCH_VERIFICATION',
          old_status: 'BRANCH VERIFICATION',
          new_status: 'CLOSED',
          remarks: branchRemarks.trim(),
          updated_by:
            profile.full_name || user.email || 'Branch User',
        })

        setSuccess(
          'Job verified successfully. The maintenance job has been closed.'
        )
      } else {
        const { error: updateError } =
          await supabase
            .from('maintenance_jobs')
            .update({
              status: 'REPAIR',
              branch_remarks: branchRemarks.trim(),
            })
            .eq('id', job.id)
            .eq('branch_id', profile.branch_id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        await supabase.from('job_updates').insert({
          job_id: job.id,
          update_type: 'BRANCH_VERIFICATION_REJECTED',
          old_status: 'BRANCH VERIFICATION',
          new_status: 'REPAIR',
          remarks: branchRemarks.trim(),
          updated_by:
            profile.full_name || user.email || 'Branch User',
        })

        setSuccess(
          'The job has been returned to repair. HQ Maintenance will be notified.'
        )
      }

      setShowVerification(false)

      await loadJob()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit verification.'
      )
    } finally {
      setSaving(false)
    }
  }

  function formatDate(value: string | null) {
    if (!value) return '-'

    return new Date(value).toLocaleString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function statusClass(value: string) {
    switch (value) {
      case 'NEW':
        return 'bg-slate-100 text-slate-700'

      case 'UNDER REVIEW':
        return 'bg-blue-100 text-blue-700'

      case 'ASSIGNED':
      case 'ACCEPTED':
        return 'bg-purple-100 text-purple-700'

      case 'SITE VISIT':
      case 'DIAGNOSIS':
      case 'REPAIR':
        return 'bg-orange-100 text-orange-700'

      case 'COMPLETED':
        return 'bg-green-100 text-green-700'

      case 'BRANCH VERIFICATION':
        return 'bg-pink-100 text-pink-700'

      case 'CLOSED':
        return 'bg-emerald-100 text-emerald-700'

      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-100 text-red-700'

      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  function priorityClass(value: string) {
    switch (value) {
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#f3dce5] border-t-[#f582ae]" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading maintenance job...
          </p>
        </div>
      </div>
    )
  }

  if (error && !job) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-black text-red-700">
          Unable to Load Job
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {error}
        </p>

        <Link
          href="/branch/jobs"
          className="mt-6 inline-flex rounded-xl bg-[#f582ae] px-5 py-3 text-sm font-bold text-white hover:bg-[#e85d91]"
        >
          Back to Jobs
        </Link>
      </div>
    )
  }

  if (!job) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/branch/jobs"
          className="text-sm font-bold text-[#e85d91] hover:underline"
        >
          ← Maintenance Jobs
        </Link>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f582ae]">
              Maintenance Job
            </p>

            <h1 className="mt-1 text-3xl font-black text-[#4a2633]">
              {job.job_number}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {job.branches?.branch_code} —{' '}
              {job.branches?.branch_name}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-4 py-2 text-xs font-bold ${priorityClass(
                job.priority
              )}`}
            >
              {job.priority}
            </span>

            <span
              className={`rounded-full px-4 py-2 text-xs font-bold ${statusClass(
                job.status
              )}`}
            >
              {job.status}
            </span>
          </div>
        </div>
      </div>

      {/* Verification action */}
      {job.status === 'BRANCH VERIFICATION' && (
        <div className="rounded-2xl border-2 border-[#f582ae] bg-pink-50 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#e85d91]">
                Action Required
              </p>

              <h2 className="mt-1 text-xl font-black text-[#4a2633]">
                Maintenance work is ready for verification
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Please inspect the completed work. If the issue has
                been resolved, verify the job to close it. If the
                problem remains, return it to repair.
              </p>
            </div>

            <button
              onClick={() => setShowVerification(true)}
              className="shrink-0 rounded-xl bg-[#f582ae] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#e85d91]"
            >
              Verify Maintenance
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-700">
          {success}
        </div>
      )}

      {/* Main information */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="dunkin-card p-6 lg:col-span-2">
          <h2 className="text-lg font-black text-[#4a2633]">
            Reported Problem
          </h2>

          <div className="mt-4 rounded-xl bg-[#fff8fa] p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {job.problem_description}
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Category
              </p>

              <p className="mt-1 font-bold text-[#4a2633]">
                {job.category}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Reported By
              </p>

              <p className="mt-1 font-bold text-[#4a2633]">
                {job.reported_by || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Reported At
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {formatDate(job.reported_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Due Date
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {formatDate(job.due_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="dunkin-card p-6">
          <h2 className="text-lg font-black text-[#4a2633]">
            Asset
          </h2>

          {job.assets ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Asset Code
                </p>

                <p className="mt-1 font-black text-[#4a2633]">
                  {job.assets.asset_code}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Equipment
                </p>

                <p className="mt-1 text-sm font-bold text-slate-700">
                  {job.assets.asset_name}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Category
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {job.assets.asset_category}
                </p>
              </div>

              {job.assets.manufacturer && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Manufacturer
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {job.assets.manufacturer}
                  </p>
                </div>
              )}

              {job.assets.model && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Model
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {job.assets.model}
                  </p>
                </div>
              )}

              {job.assets.serial_number && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Serial Number
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {job.assets.serial_number}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              This request is not linked to a specific asset.
            </div>
          )}
        </div>
      </div>

      {/* Contractor */}
      <div className="dunkin-card p-6">
        <h2 className="text-lg font-black text-[#4a2633]">
          Service Information
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Contractor
            </p>

            <p className="mt-1 font-bold text-[#4a2633]">
              {job.contractors?.company_name || 'Not assigned'}
            </p>

            {job.contractors?.contractor_code && (
              <p className="mt-1 text-xs text-slate-400">
                {job.contractors.contractor_code}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Technician
            </p>

            <p className="mt-1 font-bold text-[#4a2633]">
              {job.technician_name || '-'}
            </p>

            {job.technician_phone && (
              <p className="mt-1 text-xs text-slate-500">
                {job.technician_phone}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Scheduled Visit
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {formatDate(job.scheduled_at)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Arrival
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {formatDate(job.arrived_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Diagnosis */}
      {(job.diagnosis || job.work_performed) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="dunkin-card p-6">
            <h2 className="text-lg font-black text-[#4a2633]">
              Diagnosis
            </h2>

            <div className="mt-4 rounded-xl bg-[#fff8fa] p-5">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {job.diagnosis || 'Diagnosis not yet recorded.'}
              </p>
            </div>
          </div>

          <div className="dunkin-card p-6">
            <h2 className="text-lg font-black text-[#4a2633]">
              Work Performed
            </h2>

            <div className="mt-4 rounded-xl bg-[#fff8fa] p-5">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {job.work_performed ||
                  'Work performed has not yet been recorded.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Remarks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="dunkin-card p-6">
          <h2 className="text-lg font-black text-[#4a2633]">
            HQ Remarks
          </h2>

          <div className="mt-4 rounded-xl bg-slate-50 p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {job.hq_remarks || 'No HQ remarks.'}
            </p>
          </div>
        </div>

        <div className="dunkin-card p-6">
          <h2 className="text-lg font-black text-[#4a2633]">
            Branch Remarks
          </h2>

          <div className="mt-4 rounded-xl bg-pink-50 p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {job.branch_remarks || 'No branch remarks yet.'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="dunkin-card p-6">
        <h2 className="text-lg font-black text-[#4a2633]">
          Job Activity
        </h2>

        <div className="mt-6 space-y-5">
          {updates.length === 0 ? (
            <p className="text-sm text-slate-500">
              No activity recorded.
            </p>
          ) : (
            updates.map((update) => (
              <div
                key={update.id}
                className="relative border-l-2 border-[#f3dce5] pl-5"
              >
                <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-[#f582ae]" />

                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[#4a2633]">
                    {update.old_status
                      ? `${update.old_status} → ${update.new_status}`
                      : update.new_status || 'Job Update'}
                  </p>

                  <p className="text-xs text-slate-400">
                    {formatDate(update.updated_at)}
                  </p>
                </div>

                {update.remarks && (
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {update.remarks}
                  </p>
                )}

                {update.updated_by && (
                  <p className="mt-1 text-xs text-slate-400">
                    By {update.updated_by}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Verification modal */}
      {showVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#f582ae]">
                  Branch Verification
                </p>

                <h2 className="mt-1 text-2xl font-black text-[#4a2633]">
                  Verify Maintenance Work
                </h2>
              </div>

              <button
                onClick={() => setShowVerification(false)}
                className="text-xl font-bold text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Inspect the equipment and confirm whether the reported
              issue has been resolved.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Branch Remarks *
              </label>

              <textarea
                rows={5}
                value={branchRemarks}
                onChange={(event) =>
                  setBranchRemarks(event.target.value)
                }
                placeholder="Describe the condition after maintenance. Example: Chiller temperature returned to normal and equipment is operating correctly."
                className="w-full resize-y rounded-xl border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-pink-100"
              />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                disabled={saving}
                onClick={() => submitVerification(false)}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Issue Remains
              </button>

              <button
                disabled={saving}
                onClick={() => submitVerification(true)}
                className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving
                  ? 'Processing...'
                  : 'Verify & Close Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}