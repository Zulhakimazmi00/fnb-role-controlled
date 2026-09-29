'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  last_service_date: string | null
  next_service_date: string | null
  asset_status: string
  contractor_id: string | null
  notes: string | null

  branches?: {
    branch_name: string
    branch_code: string
  } | null

  contractors?: {
    company_name: string
    contractor_code: string
  } | null
}

type Branch = {
  id: string
  branch_code: string
  branch_name: string
}

function formatDate(date: string | null) {
  if (!date) return '-'

  return new Date(date).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getWarrantyStatus(expiry: string | null) {
  if (!expiry) {
    return 'NOT APPLICABLE'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiryDate = new Date(`${expiry}T00:00:00`)
  expiryDate.setHours(0, 0, 0, 0)

  const daysRemaining = Math.ceil(
    (expiryDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  )

  if (daysRemaining < 0) {
    return 'EXPIRED'
  }

  if (daysRemaining <= 90) {
    return 'EXPIRING SOON'
  }

  return 'ACTIVE'
}

function warrantyClass(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-700'

    case 'EXPIRING SOON':
      return 'bg-yellow-100 text-yellow-700'

    case 'EXPIRED':
      return 'bg-red-100 text-red-700'

    case 'NOT APPLICABLE':
      return 'bg-slate-100 text-slate-600'

    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function assetStatusClass(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-700'

    case 'INACTIVE':
      return 'bg-slate-100 text-slate-600'

    case 'UNDER MAINTENANCE':
      return 'bg-orange-100 text-orange-700'

    case 'RETIRED':
      return 'bg-red-100 text-red-700'

    default:
      return 'bg-blue-100 text-blue-700'
  }
}

export default function AssetsPage() {
  const supabase = createClient()

  const [assets, setAssets] = useState<Asset[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filter inputs
  const [searchInput, setSearchInput] = useState('')
  const [branchInput, setBranchInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [warrantyInput, setWarrantyInput] = useState('')

  // Applied filters
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedWarranty, setSelectedWarranty] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      const assetsResult = await supabase
        .from('assets')
        .select('*, branches(branch_name, branch_code), contractors(company_name, contractor_code)')
        .order('created_at', {
          ascending: false,
        })

      if (assetsResult.error) {
        setError(assetsResult.error.message)
        setLoading(false)
        return
      }

      const branchesResult = await supabase
        .from('branches')
        .select('id, branch_code, branch_name')
        .eq('is_active', true)
        .order('branch_code')

      if (branchesResult.error) {
        setError(branchesResult.error.message)
        setLoading(false)
        return
      }

      setAssets((assetsResult.data ?? []) as Asset[])
      setBranches((branchesResult.data ?? []) as Branch[])

      setLoading(false)
    }

    loadData()
  }, [])

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        assets
          .map((asset) => asset.asset_category)
          .filter(Boolean)
      )
    ).sort()
  }, [assets])

  const filteredAssets = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return assets.filter((asset) => {
      const warrantyStatus = getWarrantyStatus(
        asset.warranty_expiry
      )

      const matchesSearch =
        !searchText ||
        asset.asset_code
          .toLowerCase()
          .includes(searchText) ||
        asset.asset_name
          .toLowerCase()
          .includes(searchText) ||
        asset.asset_category
          .toLowerCase()
          .includes(searchText) ||
        (asset.manufacturer ?? '')
          .toLowerCase()
          .includes(searchText) ||
        (asset.model ?? '')
          .toLowerCase()
          .includes(searchText) ||
        (asset.serial_number ?? '')
          .toLowerCase()
          .includes(searchText) ||
        (asset.branches?.branch_name ?? '')
          .toLowerCase()
          .includes(searchText) ||
        (asset.branches?.branch_code ?? '')
          .toLowerCase()
          .includes(searchText) ||
        (asset.contractors?.company_name ?? '')
          .toLowerCase()
          .includes(searchText)

      const matchesBranch =
        !selectedBranch ||
        asset.branch_id === selectedBranch

      const matchesCategory =
        !selectedCategory ||
        asset.asset_category === selectedCategory

      const matchesWarranty =
        !selectedWarranty ||
        warrantyStatus === selectedWarranty

      return (
        matchesSearch &&
        matchesBranch &&
        matchesCategory &&
        matchesWarranty
      )
    })
  }, [
    assets,
    search,
    selectedBranch,
    selectedCategory,
    selectedWarranty,
  ])

  const totalAssets = filteredAssets.length

  const activeAssets = filteredAssets.filter(
    (asset) => asset.asset_status === 'ACTIVE'
  ).length

  const underWarranty = filteredAssets.filter(
    (asset) =>
      getWarrantyStatus(asset.warranty_expiry) === 'ACTIVE'
  ).length

  const expiringSoon = filteredAssets.filter(
    (asset) =>
      getWarrantyStatus(asset.warranty_expiry) ===
      'EXPIRING SOON'
  ).length

  const expiredWarranty = filteredAssets.filter(
    (asset) =>
      getWarrantyStatus(asset.warranty_expiry) === 'EXPIRED'
  ).length

  function applyFilters() {
    setSearch(searchInput)
    setSelectedBranch(branchInput)
    setSelectedCategory(categoryInput)
    setSelectedWarranty(warrantyInput)
  }

  function resetFilters() {
    setSearchInput('')
    setBranchInput('')
    setCategoryInput('')
    setWarrantyInput('')

    setSearch('')
    setSelectedBranch('')
    setSelectedCategory('')
    setSelectedWarranty('')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#e85d91]">
            Asset Management
          </p>

          <h1 className="dunkin-heading mt-1 text-3xl font-black">
            Asset Register
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Equipment, warranty and maintenance asset tracking
          </p>
        </div>

        <div className="dunkin-card p-8 text-sm text-slate-500">
          Loading assets...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#e85d91]">
            Asset Management
          </p>

          <h1 className="dunkin-heading mt-1 text-3xl font-black">
            Asset Register
          </h1>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="font-black">
            Unable to load assets
          </div>

          <div className="mt-1 text-sm">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#e85d91]">
            Asset Management
          </p>

          <h1 className="dunkin-heading mt-1 text-3xl font-black">
            Asset Register
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Equipment, warranty and maintenance asset tracking
          </p>
        </div>

        <Link
          href="/assets/new"
          className="dunkin-primary inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black shadow-sm transition hover:shadow-md"
        >
          + Add Asset
        </Link>

      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total Assets
          </div>

          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            {totalAssets}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Active
          </div>

          <div className="mt-2 text-3xl font-black text-green-600">
            {activeAssets}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Under Warranty
          </div>

          <div className="mt-2 text-3xl font-black text-blue-600">
            {underWarranty}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Expiring Soon
          </div>

          <div className="mt-2 text-3xl font-black text-yellow-600">
            {expiringSoon}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Expired Warranty
          </div>

          <div className="mt-2 text-3xl font-black text-red-600">
            {expiredWarranty}
          </div>
        </div>

      </div>

      {/* SEARCH & FILTERS */}
      <div className="dunkin-card p-5">

        <div className="mb-5">
          <h2 className="text-lg font-black text-[#4a2633]">
            Search & Filters
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter your criteria and click Apply Filters.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">

          {/* SEARCH */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#4a2633]">
              Search
            </label>

            <input
              type="text"
              value={searchInput}
              onChange={(e) =>
                setSearchInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyFilters()
                }
              }}
              placeholder="Asset, serial, model, branch..."
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            />
          </div>

          {/* BRANCH */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#4a2633]">
              Branch
            </label>

            <select
              value={branchInput}
              onChange={(e) =>
                setBranchInput(e.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            >
              <option value="">
                All Branches
              </option>

              {branches.map((branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.branch_code} — {branch.branch_name}
                </option>
              ))}
            </select>
          </div>

          {/* CATEGORY */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#4a2633]">
              Category
            </label>

            <select
              value={categoryInput}
              onChange={(e) =>
                setCategoryInput(e.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            >
              <option value="">
                All Categories
              </option>

              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* WARRANTY */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#4a2633]">
              Warranty
            </label>

            <select
              value={warrantyInput}
              onChange={(e) =>
                setWarrantyInput(e.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            >
              <option value="">
                All Warranty Status
              </option>

              <option value="ACTIVE">
                ACTIVE
              </option>

              <option value="EXPIRING SOON">
                EXPIRING SOON
              </option>

              <option value="EXPIRED">
                EXPIRED
              </option>

              <option value="NOT APPLICABLE">
                NOT APPLICABLE
              </option>
            </select>
          </div>

        </div>

        {/* BUTTONS */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-[#f3dce5] bg-white px-5 py-3 text-sm font-bold text-[#4a2633] transition hover:bg-[#fff8fa]"
          >
            Reset Filters
          </button>

          <button
            type="button"
            onClick={applyFilters}
            className="dunkin-primary rounded-xl px-6 py-3 text-sm font-black shadow-sm transition hover:shadow-md"
          >
            Apply Filters
          </button>

        </div>

      </div>

      {/* REGISTER HEADER */}
      <div>
        <h2 className="text-xl font-black text-[#4a2633]">
          Asset Register
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Showing {filteredAssets.length} of {assets.length} assets
        </p>
      </div>

      {/* TABLE */}
      <div className="dunkin-card overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1500px] text-left">

            <thead className="bg-[#fff8fa]">

              <tr className="border-b border-[#f3dce5]">

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Asset
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Branch
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Equipment
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Category
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Serial
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Warranty
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Warranty Expiry
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Contractor
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Next Service
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Status
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-[#f3dce5]">

              {filteredAssets.map((asset) => {

                const warrantyStatus = getWarrantyStatus(
                  asset.warranty_expiry
                )

                return (
                  <tr
                    key={asset.id}
                    className="transition hover:bg-[#fff8fa]"
                  >

                    {/* ASSET */}
                    <td className="px-6 py-5">

                      <Link
                        href={`/assets/${asset.id}`}
                        className="inline-flex rounded-lg px-2 py-1 font-bold text-[#e85d91] transition hover:bg-[#fff0f5] hover:underline"
                      >
                        {asset.asset_code}
                      </Link>

                      <div className="mt-1 text-xs text-slate-500">
                        {asset.asset_name}
                      </div>

                    </td>

                    {/* BRANCH */}
                    <td className="px-6 py-5">

                      <div className="font-bold text-[#4a2633]">
                        {asset.branches?.branch_code ?? '-'}
                      </div>

                      <div className="text-xs text-slate-500">
                        {asset.branches?.branch_name ?? '-'}
                      </div>

                    </td>

                    {/* EQUIPMENT */}
                    <td className="px-6 py-5">

                      <div className="font-bold text-slate-700">
                        {asset.manufacturer ?? '-'}
                      </div>

                      <div className="text-xs text-slate-500">
                        {asset.model ?? '-'}
                      </div>

                    </td>

                    {/* CATEGORY */}
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {asset.asset_category}
                    </td>

                    {/* SERIAL */}
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {asset.serial_number ?? '-'}
                    </td>

                    {/* WARRANTY */}
                    <td className="px-6 py-5">

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${warrantyClass(
                          warrantyStatus
                        )}`}
                      >
                        {warrantyStatus}
                      </span>

                    </td>

                    {/* WARRANTY EXPIRY */}
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {formatDate(asset.warranty_expiry)}
                    </td>

                    {/* CONTRACTOR */}
                    <td className="px-6 py-5">

                      <div className="font-bold text-slate-700">
                        {asset.contractors?.contractor_code ?? '-'}
                      </div>

                      <div className="text-xs text-slate-500">
                        {asset.contractors?.company_name ?? '-'}
                      </div>

                    </td>

                    {/* NEXT SERVICE */}
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {formatDate(asset.next_service_date)}
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-5">

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${assetStatusClass(
                          asset.asset_status
                        )}`}
                      >
                        {asset.asset_status}
                      </span>

                    </td>

                  </tr>
                )
              })}

              {filteredAssets.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-16 text-center"
                  >
                    <div className="text-lg font-black text-[#4a2633]">
                      No assets found
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Try changing your search or filters.
                    </p>
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}