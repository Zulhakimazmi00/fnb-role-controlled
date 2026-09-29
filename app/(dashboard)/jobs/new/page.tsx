'use client'

import { useEffect, useState } from 'react'
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
  branch_id: string
}

type Contractor = {
  id: string
  contractor_code: string
  company_name: string
  service_category: string | null
}

export default function NewJobPage() {
  const router = useRouter()
  const supabase = createClient()

  const [branches, setBranches] = useState<Branch[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])

  const [branchId, setBranchId] = useState('')
  const [assetId, setAssetId] = useState('')
  const [contractorId, setContractorId] = useState('')

  const [category, setCategory] = useState('REFRIGERATION')
  const [priority, setPriority] = useState('MEDIUM')
  const [problemDescription, setProblemDescription] = useState('')
  const [reportedBy, setReportedBy] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [technicianName, setTechnicianName] = useState('')
  const [technicianPhone, setTechnicianPhone] = useState('')
  const [hqRemarks, setHqRemarks] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      const [
        { data: branchData, error: branchError },
        { data: contractorData, error: contractorError },
      ] = await Promise.all([
        supabase
          .from('branches')
          .select('id, branch_code, branch_name')
          .eq('is_active', true)
          .order('branch_code'),

        supabase
          .from('contractors')
          .select(
            'id, contractor_code, company_name, service_category'
          )
          .eq('is_active', true)
          .order('company_name'),
      ])

      if (branchError) {
        setError(branchError.message)
        setLoading(false)
        return
      }

      if (contractorError) {
        setError(contractorError.message)
        setLoading(false)
        return
      }

      setBranches(branchData ?? [])
      setContractors(contractorData ?? [])
      setLoading(false)
    }

    loadData()
  }, [])

  useEffect(() => {
    async function loadAssets() {
      if (!branchId) {
        setAssets([])
        setAssetId('')
        return
      }

      const { data, error } = await supabase
        .from('assets')
        .select(
          'id, asset_code, asset_name, asset_category, branch_id'
        )
        .eq('branch_id', branchId)
        .eq('asset_status', 'ACTIVE')
        .order('asset_code')

      if (error) {
        setError(error.message)
        return
      }

      setAssets(data ?? [])
      setAssetId('')
    }

    loadAssets()
  }, [branchId])

  async function createJob() {
    setError('')

    if (!branchId) {
      setError('Please select a branch.')
      return
    }

    if (!problemDescription.trim()) {
      setError('Please enter the problem description.')
      return
    }

    setSaving(true)

    try {
      const { data: existingJobs, error: countError } = await supabase
        .from('maintenance_jobs')
        .select('job_number')
        .like('job_number', 'MNT-2026-%')
        .order('job_number', { ascending: false })
        .limit(1)

      if (countError) {
        throw new Error(countError.message)
      }

      let nextNumber = 1

      if (existingJobs && existingJobs.length > 0) {
        const lastNumber = Number(
          existingJobs[0].job_number.split('-').pop()
        )

        if (!Number.isNaN(lastNumber)) {
          nextNumber = lastNumber + 1
        }
      }

      const jobNumber = `MNT-2026-${String(nextNumber).padStart(
        5,
        '0'
      )}`

      const { data: userData } = await supabase.auth.getUser()

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userData.user?.id ?? '')
        .maybeSingle()

      const { data: job, error: jobError } = await supabase
        .from('maintenance_jobs')
        .insert({
          job_number: jobNumber,
          branch_id: branchId,
          asset_id: assetId || null,
          contractor_id: contractorId || null,
          category,
          priority,
          status: 'NEW',
          problem_description: problemDescription.trim(),
          reported_by:
            reportedBy.trim() ||
            profile?.full_name ||
            userData.user?.email ||
            'HQ Admin',
          reported_at: new Date().toISOString(),
          due_at: dueAt
            ? new Date(dueAt).toISOString()
            : null,
          estimated_cost: estimatedCost
            ? Number(estimatedCost)
            : 0,
          technician_name: technicianName.trim() || null,
          technician_phone: technicianPhone.trim() || null,
          hq_remarks: hqRemarks.trim() || null,
        })
        .select('id')
        .single()

      if (jobError) {
        throw new Error(jobError.message)
      }

      if (!job) {
        throw new Error('Job was created but no job ID was returned.')
      }

      const { error: updateError } = await supabase
        .from('job_updates')
        .insert({
          job_id: job.id,
          update_type: 'STATUS_CHANGE',
          old_status: null,
          new_status: 'NEW',
          remarks: 'Maintenance job created.',
          updated_by:
            profile?.full_name ||
            userData.user?.email ||
            'HQ Admin',
        })

      if (updateError) {
        console.error('Audit log error:', updateError.message)
      }

      router.push(`/jobs/${job.id}`)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create maintenance job.'
      )
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="dunkin-card p-8">
        <p className="text-sm text-slate-500">
          Loading maintenance job form...
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => router.push('/jobs')}
          className="text-sm font-semibold text-[#e85d91] hover:underline"
        >
          ← Back to Maintenance Jobs
        </button>

        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-[#f582ae]">
          DUNKIN' MAINTENANCE
        </p>

        <h1 className="mt-1 text-3xl font-black text-[#4a2633]">
          Create Maintenance Job
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Register a new maintenance issue for HQ control and contractor
          follow-up.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Job Information */}
      <div className="dunkin-card p-6">
        <div className="mb-6 border-b border-[#f3dce5] pb-4">
          <h2 className="text-lg font-bold text-[#4a2633]">
            Job Information
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Basic information about the maintenance request.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Branch */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Branch <span className="text-red-500">*</span>
            </label>

            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-lg border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="">Select branch</option>

              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_code} — {branch.branch_name}
                </option>
              ))}
            </select>
          </div>

          {/* Asset */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Asset / Equipment
            </label>

            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              disabled={!branchId}
              className="w-full rounded-lg border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-100 focus:border-[#f582ae]"
            >
              <option value="">
                {branchId
                  ? 'Select asset'
                  : 'Select branch first'}
              </option>

              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_code} — {asset.asset_name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Maintenance Category
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option>REFRIGERATION</option>
              <option>HVAC</option>
              <option>ELECTRICAL</option>
              <option>PLUMBING</option>
              <option>CIVIL</option>
              <option>KITCHEN EQUIPMENT</option>
              <option>FIRE PROTECTION</option>
              <option>IT / POS</option>
              <option>OTHER</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Priority
            </label>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="CRITICAL">
                CRITICAL — Immediate attention
              </option>
              <option value="HIGH">
                HIGH — Urgent
              </option>
              <option value="MEDIUM">
                MEDIUM — Normal
              </option>
              <option value="LOW">
                LOW — Non-urgent
              </option>
            </select>
          </div>

          {/* Reported By */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Reported By
            </label>

            <input
              type="text"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              placeholder="Outlet Manager / Staff name"
              className="w-full rounded-lg border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>

          {/* Due */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Target Completion / Due Date
            </label>

            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full rounded-lg border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>
        </div>

        {/* Problem */}
        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Problem Description <span className="text-red-500">*</span>
          </label>

          <textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            rows={5}
            placeholder="Describe the issue, symptoms, operational impact, etc."
            className="w-full resize-none rounded-lg border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
          />
        </div>
      </div>

      {/* Contractor */}
      <div className="dunkin-card p-6">
        <div className="mb-6 border-b border-[#f3dce5] pb-4">
          <h2 className="text-lg font-bold text-[#4a2633]">
            Contractor Assignment
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Contractor can be assigned now or later by HQ Maintenance.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Contractor
            </label>

            <select
              value={contractorId}
              onChange={(e) => setContractorId(e.target.value)}
              className="w-full rounded-lg border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="">Unassigned</option>

              {contractors.map((contractor) => (
                <option
                  key={contractor.id}
                  value={contractor.id}
                >
                  {contractor.contractor_code} —{' '}
                  {contractor.company_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Estimated Cost (RM)
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Technician Name
            </label>

            <input
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="Technician name"
              className="w-full rounded-lg border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Technician Phone
            </label>

            <input
              type="text"
              value={technicianPhone}
              onChange={(e) => setTechnicianPhone(e.target.value)}
              placeholder="01X-XXXXXXX"
              className="w-full rounded-lg border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>
        </div>
      </div>

      {/* HQ Remarks */}
      <div className="dunkin-card p-6">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          HQ Remarks
        </label>

        <textarea
          value={hqRemarks}
          onChange={(e) => setHqRemarks(e.target.value)}
          rows={4}
          placeholder="Internal HQ instructions or remarks..."
          className="w-full resize-none rounded-lg border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.push('/jobs')}
          className="rounded-xl border border-[#f3dce5] bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-[#fff8fa]"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={createJob}
          disabled={saving}
          className="rounded-xl bg-[#f582ae] px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#e85d91] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Creating Job...' : 'Create Maintenance Job'}
        </button>
      </div>
    </div>
  )
}