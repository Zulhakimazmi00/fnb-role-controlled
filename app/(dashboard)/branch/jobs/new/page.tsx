'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Branch = {
  id: string
  branch_code: string
  branch_name: string
}

type Asset = {
  id: string
  asset_code: string
  asset_name: string
  asset_category: string
  manufacturer: string | null
  model: string | null
  branch_id: string
}

const categories = [
  'AIR CONDITIONING',
  'REFRIGERATION',
  'ELECTRICAL',
  'PLUMBING',
  'CIVIL',
  'KITCHEN EQUIPMENT',
  'FIRE & SAFETY',
  'IT / NETWORK',
  'SIGNAGE',
  'OTHER',
]

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function NewBranchJobPage() {
  const supabase = createClient()
  const router = useRouter()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [assetId, setAssetId] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [reportedBy, setReportedBy] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [problemDescription, setProblemDescription] = useState('')
  const [hqRemarks, setHqRemarks] = useState('')

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId) || null,
    [assets, assetId]
  )

  useEffect(() => {
    loadForm()
  }, [])

  async function loadForm() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Your session has expired. Please log in again.')
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('branch_id, role, is_active, full_name, phone')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        throw new Error(profileError.message)
      }

      if (!profile) {
        throw new Error('Your user profile could not be found.')
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

      const [{ data: branchData, error: branchError }, { data: assetData, error: assetError }] =
        await Promise.all([
          supabase
            .from('branches')
            .select('id, branch_code, branch_name')
            .eq('id', profile.branch_id)
            .maybeSingle(),

          supabase
            .from('assets')
            .select(
              'id, asset_code, asset_name, asset_category, manufacturer, model, branch_id'
            )
            .eq('branch_id', profile.branch_id)
            .order('asset_code', { ascending: true }),
        ])

      if (branchError) {
        throw new Error(branchError.message)
      }

      if (assetError) {
        throw new Error(assetError.message)
      }

      setBranch(branchData)
      setAssets((assetData as Asset[]) || [])

      setReportedBy(profile.full_name || '')
      setContactPhone(profile.phone || '')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load the maintenance request form.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function generateJobNumber() {
    const year = new Date().getFullYear()

    const { data, error: queryError } = await supabase
      .from('maintenance_jobs')
      .select('job_number')
      .like('job_number', `MNT-${year}-%`)
      .order('job_number', { ascending: false })
      .limit(1)

    if (queryError) {
      throw new Error(queryError.message)
    }

    let nextNumber = 1

    if (data && data.length > 0) {
      const latestNumber = Number(
        data[0].job_number.split('-').pop()
      )

      if (!Number.isNaN(latestNumber)) {
        nextNumber = latestNumber + 1
      }
    }

    return `MNT-${year}-${String(nextNumber).padStart(5, '0')}`
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!category) {
      setError('Please select a maintenance category.')
      return
    }

    if (!reportedBy.trim()) {
      setError('Please enter the reporter name.')
      return
    }

    if (!problemDescription.trim()) {
      setError('Please describe the maintenance problem.')
      return
    }

    if (problemDescription.trim().length < 10) {
      setError(
        'Please provide more detail about the problem.'
      )
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Your session has expired. Please log in again.')
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('branch_id, role, is_active')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        throw new Error(profileError.message)
      }

      if (
        !profile ||
        profile.role !== 'BRANCH_USER' ||
        !profile.is_active ||
        !profile.branch_id
      ) {
        throw new Error(
          'You are not authorized to create a maintenance request.'
        )
      }

      const jobNumber = await generateJobNumber()

      const { data: job, error: jobError } = await supabase
        .from('maintenance_jobs')
        .insert({
          job_number: jobNumber,
          branch_id: profile.branch_id,
          asset_id: assetId || null,
          category,
          priority,
          status: 'NEW',
          problem_description: problemDescription.trim(),
          reported_by: reportedBy.trim(),
          reported_at: new Date().toISOString(),
          hq_remarks: hqRemarks.trim() || null,
        })
        .select('id, job_number')
        .single()

      if (jobError) {
        throw new Error(jobError.message)
      }

      const { error: updateError } = await supabase
        .from('job_updates')
        .insert({
          job_id: job.id,
          update_type: 'JOB_CREATED',
          old_status: null,
          new_status: 'NEW',
          remarks:
            'Maintenance request submitted by branch.',
          updated_by: user.email || reportedBy.trim(),
        })

      if (updateError) {
        console.error(
          'Job created but audit entry failed:',
          updateError.message
        )
      }

      setSuccess(
        `Maintenance request ${job.job_number} has been submitted successfully.`
      )

      setTimeout(() => {
        router.push(`/branch/jobs/${job.id}`)
        router.refresh()
      }, 1000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit maintenance request.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#f3dce5] border-t-[#f582ae]" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading request form...
          </p>
        </div>
      </div>
    )
  }

  if (error && !branch) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-black text-red-700">
          Unable to Load Form
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {error}
        </p>

        <button
          onClick={loadForm}
          className="mt-6 rounded-xl bg-[#f582ae] px-5 py-3 text-sm font-bold text-white hover:bg-[#e85d91]"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/branch/jobs"
          className="text-sm font-bold text-[#e85d91] hover:underline"
        >
          ← Maintenance Jobs
        </Link>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#f582ae]">
          Branch Portal
        </p>

        <h1 className="mt-1 text-3xl font-black text-[#4a2633]">
          Report New Maintenance Issue
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Submit a maintenance request to HQ Maintenance for review
          and contractor assignment.
        </p>
      </div>

      {/* Branch lock */}
      <div className="dunkin-card border-l-4 border-l-[#f582ae] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Requesting Branch
            </p>

            <p className="mt-1 text-lg font-black text-[#4a2633]">
              {branch?.branch_code} — {branch?.branch_name}
            </p>
          </div>

          <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-[#e85d91]">
            Automatically Assigned
          </span>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Your account is restricted to this branch. The branch
          cannot be changed from this form.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="dunkin-card p-6">
          <h2 className="text-lg font-black text-[#4a2633]">
            Issue Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Provide enough information for HQ and the contractor to
            understand the issue.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Asset / Equipment
              </label>

              <select
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-pink-100"
              >
                <option value="">
                  General issue / Asset not selected
                </option>

                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_code} — {asset.asset_name}
                  </option>
                ))}
              </select>

              {selectedAsset && (
                <div className="mt-2 rounded-lg bg-[#fff8fa] p-3 text-xs text-slate-500">
                  <p>
                    <strong>Category:</strong>{' '}
                    {selectedAsset.asset_category}
                  </p>

                  {selectedAsset.manufacturer && (
                    <p className="mt-1">
                      <strong>Manufacturer:</strong>{' '}
                      {selectedAsset.manufacturer}
                    </p>
                  )}

                  {selectedAsset.model && (
                    <p className="mt-1">
                      <strong>Model:</strong>{' '}
                      {selectedAsset.model}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Maintenance Category *
              </label>

              <select
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-pink-100"
              >
                <option value="">
                  Select category
                </option>

                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Priority *
              </label>

              <select
                required
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-pink-100"
              >
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Reporter Name *
              </label>

              <input
                required
                value={reportedBy}
                onChange={(event) =>
                  setReportedBy(event.target.value)
                }
                placeholder="Person reporting the issue"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-pink-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Contact Phone
              </label>

              <input
                type="tel"
                value={contactPhone}
                onChange={(event) =>
                  setContactPhone(event.target.value)
                }
                placeholder="Contact number"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-pink-100"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Problem Description *
            </label>

            <textarea
              required
              rows={6}
              value={problemDescription}
              onChange={(event) =>
                setProblemDescription(event.target.value)
              }
              placeholder="Describe what happened, symptoms observed, equipment condition, error message, temperature reading, leakage, noise, etc."
              className="w-full resize-y rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-pink-100"
            />

            <p className="mt-2 text-xs text-slate-400">
              Be as specific as possible. Detailed information
              helps HQ and contractors diagnose the problem faster.
            </p>
          </div>
        </div>

        {/* Optional HQ note */}
        <div className="dunkin-card p-6">
          <h2 className="text-lg font-black text-[#4a2633]">
            Additional Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add any information that may help HQ process the
            request.
          </p>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Additional Remarks
            </label>

            <textarea
              rows={4}
              value={hqRemarks}
              onChange={(event) =>
                setHqRemarks(event.target.value)
              }
              placeholder="Opening hours, access restrictions, customer impact, temporary workaround, urgency details..."
              className="w-full resize-y rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-pink-100"
            />
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 font-black text-orange-600">
              !
            </div>

            <div>
              <h3 className="text-sm font-black text-orange-800">
                Before submitting
              </h3>

              <p className="mt-1 text-sm leading-6 text-orange-700">
                Make sure the problem description and priority
                accurately represent the issue. Critical should be
                used for issues that require urgent attention or
                may significantly affect branch operations.
              </p>
            </div>
          </div>
        </div>

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

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/branch/jobs"
            className="rounded-xl border border-[#f3dce5] bg-white px-6 py-3 text-center text-sm font-bold text-[#4a2633] hover:bg-[#fff8fa]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#f582ae] px-7 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#e85d91] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? 'Submitting...'
              : 'Submit Maintenance Request'}
          </button>
        </div>
      </form>
    </div>
  )
}