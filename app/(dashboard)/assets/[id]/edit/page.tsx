'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Branch = {
  id: string
  branch_code: string
  branch_name: string
}

type Contractor = {
  id: string
  contractor_code: string
  company_name: string
}

type Asset = {
  id: string
  asset_code: string
  branch_id: string
  asset_category: string
  asset_name: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  installation_date: string | null
  warranty_expiry: string | null
  contractor_id: string | null
  last_service_date: string | null
  next_service_date: string | null
  asset_status: string
  notes: string | null
}

export default function EditAssetPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const assetId = params.id as string

  const [branches, setBranches] = useState<Branch[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    asset_code: '',
    branch_id: '',
    asset_category: '',
    asset_name: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    installation_date: '',
    warranty_expiry: '',
    contractor_id: '',
    last_service_date: '',
    next_service_date: '',
    asset_status: 'ACTIVE',
    notes: '',
  })

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      const [assetResult, branchesResult, contractorsResult] =
        await Promise.all([
          supabase
            .from('assets')
            .select('*')
            .eq('id', assetId)
            .single(),

          supabase
            .from('branches')
            .select('id, branch_code, branch_name')
            .eq('is_active', true)
            .order('branch_code'),

          supabase
            .from('contractors')
            .select('id, contractor_code, company_name')
            .eq('is_active', true)
            .order('company_name'),
        ])

      if (assetResult.error) {
        setError(assetResult.error.message)
        setLoading(false)
        return
      }

      if (branchesResult.error) {
        setError(branchesResult.error.message)
        setLoading(false)
        return
      }

      if (contractorsResult.error) {
        setError(contractorsResult.error.message)
        setLoading(false)
        return
      }

      const asset = assetResult.data as Asset

      setForm({
        asset_code: asset.asset_code ?? '',
        branch_id: asset.branch_id ?? '',
        asset_category: asset.asset_category ?? '',
        asset_name: asset.asset_name ?? '',
        manufacturer: asset.manufacturer ?? '',
        model: asset.model ?? '',
        serial_number: asset.serial_number ?? '',
        installation_date: asset.installation_date ?? '',
        warranty_expiry: asset.warranty_expiry ?? '',
        contractor_id: asset.contractor_id ?? '',
        last_service_date: asset.last_service_date ?? '',
        next_service_date: asset.next_service_date ?? '',
        asset_status: asset.asset_status ?? 'ACTIVE',
        notes: asset.notes ?? '',
      })

      setBranches(branchesResult.data ?? [])
      setContractors(contractorsResult.data ?? [])

      setLoading(false)
    }

    if (assetId) {
      loadData()
    }
  }, [assetId, supabase])

  function updateField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')

    if (!form.asset_code.trim()) {
      setError('Asset Code is required.')
      return
    }

    if (!form.branch_id) {
      setError('Please select a branch.')
      return
    }

    if (!form.asset_category.trim()) {
      setError('Asset Category is required.')
      return
    }

    if (!form.asset_name.trim()) {
      setError('Asset Name is required.')
      return
    }

    setSaving(true)

    const { error: updateError } = await supabase
      .from('assets')
      .update({
        asset_code: form.asset_code.trim(),
        branch_id: form.branch_id,
        asset_category: form.asset_category.trim(),
        asset_name: form.asset_name.trim(),
        manufacturer: form.manufacturer.trim() || null,
        model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null,
        installation_date: form.installation_date || null,
        warranty_expiry: form.warranty_expiry || null,
        contractor_id: form.contractor_id || null,
        last_service_date: form.last_service_date || null,
        next_service_date: form.next_service_date || null,
        asset_status: form.asset_status,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push(`/assets/${assetId}`)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#e85d91]">
            Equipment Management
          </p>

          <h1 className="dunkin-heading mt-1 text-3xl font-black">
            Edit Asset
          </h1>
        </div>

        <div className="dunkin-card p-8 text-sm text-slate-500">
          Loading asset information...
        </div>
      </div>
    )
  }

  if (error && !form.asset_code) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#e85d91]">
            Equipment Management
          </p>

          <h1 className="dunkin-heading mt-1 text-3xl font-black">
            Edit Asset
          </h1>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="font-black">
            Unable to load asset
          </div>

          <div className="mt-1 text-sm">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#e85d91]">
            Equipment Management
          </p>

          <h1 className="dunkin-heading mt-1 text-3xl font-black">
            Edit Asset
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Update equipment, warranty and service information.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/assets/${assetId}`)}
          className="rounded-xl border border-[#f3dce5] bg-white px-5 py-3 text-sm font-bold text-[#4a2633] transition hover:bg-[#fff8fa]"
        >
          ← Back to Asset
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          <div className="font-black">
            Unable to update asset
          </div>

          <div className="mt-1">
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="dunkin-card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-[#4a2633]">
              Asset Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Update the equipment identification details.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Asset Code *
              </label>

              <input
                type="text"
                value={form.asset_code}
                onChange={(e) =>
                  updateField('asset_code', e.target.value)
                }
                required
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Branch *
              </label>

              <select
                value={form.branch_id}
                onChange={(e) =>
                  updateField('branch_id', e.target.value)
                }
                required
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              >
                <option value="">
                  Select Branch
                </option>

                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_code} — {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Asset Category *
              </label>

              <input
                type="text"
                value={form.asset_category}
                onChange={(e) =>
                  updateField('asset_category', e.target.value)
                }
                required
                placeholder="e.g. REFRIGERATION"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Asset Name *
              </label>

              <input
                type="text"
                value={form.asset_name}
                onChange={(e) =>
                  updateField('asset_name', e.target.value)
                }
                required
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Manufacturer
              </label>

              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) =>
                  updateField('manufacturer', e.target.value)
                }
                placeholder="e.g. Daikin"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Model
              </label>

              <input
                type="text"
                value={form.model}
                onChange={(e) =>
                  updateField('model', e.target.value)
                }
                placeholder="Equipment model"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Serial Number
              </label>

              <input
                type="text"
                value={form.serial_number}
                onChange={(e) =>
                  updateField('serial_number', e.target.value)
                }
                placeholder="Equipment serial number"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>
          </div>
        </div>

        <div className="dunkin-card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-[#4a2633]">
              Warranty Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Maintain warranty coverage information.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Installation Date
              </label>

              <input
                type="date"
                value={form.installation_date}
                onChange={(e) =>
                  updateField('installation_date', e.target.value)
                }
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Warranty Expiry
              </label>

              <input
                type="date"
                value={form.warranty_expiry}
                onChange={(e) =>
                  updateField('warranty_expiry', e.target.value)
                }
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Warranty / Service Contractor
              </label>

              <select
                value={form.contractor_id}
                onChange={(e) =>
                  updateField('contractor_id', e.target.value)
                }
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              >
                <option value="">
                  No Contractor Selected
                </option>

                {contractors.map((contractor) => (
                  <option
                    key={contractor.id}
                    value={contractor.id}
                  >
                    {contractor.contractor_code} — {contractor.company_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="dunkin-card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-[#4a2633]">
              Service Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Update maintenance and asset status information.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Last Service Date
              </label>

              <input
                type="date"
                value={form.last_service_date}
                onChange={(e) =>
                  updateField('last_service_date', e.target.value)
                }
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Next Service Date
              </label>

              <input
                type="date"
                value={form.next_service_date}
                onChange={(e) =>
                  updateField('next_service_date', e.target.value)
                }
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Asset Status
              </label>

              <select
                value={form.asset_status}
                onChange={(e) =>
                  updateField('asset_status', e.target.value)
                }
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="UNDER_REPAIR">
                  UNDER REPAIR
                </option>
                <option value="DISPOSED">DISPOSED</option>
              </select>
            </div>
          </div>
        </div>

        <div className="dunkin-card p-6">
          <h2 className="text-xl font-black text-[#4a2633]">
            Notes
          </h2>

          <textarea
            value={form.notes}
            onChange={(e) =>
              updateField('notes', e.target.value)
            }
            rows={5}
            placeholder="Additional asset information..."
            className="mt-4 w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() =>
              router.push(`/assets/${assetId}`)
            }
            disabled={saving}
            className="rounded-xl border border-[#f3dce5] bg-white px-6 py-3 text-sm font-bold text-[#4a2633] transition hover:bg-[#fff8fa] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="dunkin-primary rounded-xl px-6 py-3 text-sm font-black shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
