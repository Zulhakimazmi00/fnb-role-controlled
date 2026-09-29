'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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
  branch_id: string
  estimated_cost: number | null
  actual_cost: number | null

  branches?: {
    branch_name: string
    branch_code: string
  } | null

  assets?: {
    asset_code: string
    asset_name: string
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

function priorityClass(priority: string) {
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
      return 'bg-slate-100 text-slate-600'
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'NEW':
      return 'bg-slate-100 text-slate-700'
    case 'UNDER REVIEW':
      return 'bg-purple-100 text-purple-700'
    case 'ASSIGNED':
      return 'bg-blue-100 text-blue-700'
    case 'ACCEPTED':
      return 'bg-cyan-100 text-cyan-700'
    case 'SITE VISIT':
      return 'bg-indigo-100 text-indigo-700'
    case 'DIAGNOSIS':
      return 'bg-orange-100 text-orange-700'
    case 'REPAIR':
      return 'bg-yellow-100 text-yellow-700'
    case 'COMPLETED':
      return 'bg-green-100 text-green-700'
    case 'BRANCH VERIFICATION':
      return 'bg-teal-100 text-teal-700'
    case 'CLOSED':
      return 'bg-emerald-100 text-emerald-700'
    case 'ON HOLD':
      return 'bg-gray-100 text-gray-700'
    case 'CANCELLED':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function formatDate(date: string | null) {
  if (!date) return '-'

  return new Date(date).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isOverdue(job: Job) {
  if (!job.due_at) return false

  if (
    job.status === 'COMPLETED' ||
    job.status === 'BRANCH VERIFICATION' ||
    job.status === 'CLOSED' ||
    job.status === 'CANCELLED'
  ) {
    return false
  }

  return new Date(job.due_at).getTime() < Date.now()
}

export default function JobsPage() {
  const supabase = createClient()

  const [jobs, setJobs] = useState<Job[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filter inputs
  const [searchInput, setSearchInput] = useState('')
  const [branchInput, setBranchInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [priorityInput, setPriorityInput] = useState('')
  const [statusInput, setStatusInput] = useState('')
  const [overdueInput, setOverdueInput] = useState('')

  // Applied filters
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedOverdue, setSelectedOverdue] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      const jobsResult = await supabase
        .from('maintenance_jobs')
        .select('*, branches(branch_name, branch_code), assets(asset_code, asset_name), contractors(company_name, contractor_code)')
        .order('created_at', {
          ascending: false,
        })

      if (jobsResult.error) {
        setError(jobsResult.error.message)
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

      setJobs((jobsResult.data ?? []) as Job[])
      setBranches((branchesResult.data ?? []) as Branch[])

      setLoading(false)
    }

    loadData()
  }, [])

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => job.category)
          .filter(Boolean)
      )
    ).sort()
  }, [jobs])

  const statuses = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => job.status)
          .filter(Boolean)
      )
    ).sort()
  }, [jobs])

  const filteredJobs = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return jobs.filter((job) => {
      const matchesSearch =
        !searchText ||
        job.job_number.toLowerCase().includes(searchText) ||
        job.problem_description.toLowerCase().includes(searchText) ||
        job.category.toLowerCase().includes(searchText) ||
        (job.reported_by ?? '').toLowerCase().includes(searchText) ||
        (job.branches?.branch_name ?? '').toLowerCase().includes(searchText) ||
        (job.branches?.branch_code ?? '').toLowerCase().includes(searchText) ||
        (job.assets?.asset_code ?? '').toLowerCase().includes(searchText) ||
        (job.assets?.asset_name ?? '').toLowerCase().includes(searchText) ||
        (job.contractors?.company_name ?? '').toLowerCase().includes(searchText)

      const matchesBranch =
        !selectedBranch ||
        job.branch_id === selectedBranch

      const matchesCategory =
        !selectedCategory ||
        job.category === selectedCategory

      const matchesPriority =
        !selectedPriority ||
        job.priority === selectedPriority

      const matchesStatus =
        !selectedStatus ||
        job.status === selectedStatus

      const overdue = isOverdue(job)

      const matchesOverdue =
        !selectedOverdue ||
        (selectedOverdue === 'OVERDUE' && overdue) ||
        (selectedOverdue === 'NOT_OVERDUE' && !overdue)

      return (
        matchesSearch &&
        matchesBranch &&
        matchesCategory &&
        matchesPriority &&
        matchesStatus &&
        matchesOverdue
      )
    })
  }, [
    jobs,
    search,
    selectedBranch,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    selectedOverdue,
  ])

  const totalJobs = filteredJobs.length

  const openJobs = filteredJobs.filter(
    (job) =>
      ![
        'COMPLETED',
        'BRANCH VERIFICATION',
        'CLOSED',
        'CANCELLED',
      ].includes(job.status)
  ).length

  const inProgressJobs = filteredJobs.filter((job) =>
    [
      'ASSIGNED',
      'ACCEPTED',
      'SITE VISIT',
      'DIAGNOSIS',
      'REPAIR',
    ].includes(job.status)
  ).length

  const criticalJobs = filteredJobs.filter(
    (job) => job.priority === 'CRITICAL'
  ).length

  const overdueJobs = filteredJobs.filter(
    (job) => isOverdue(job)
  ).length

  function applyFilters() {
    setSearch(searchInput)
    setSelectedBranch(branchInput)
    setSelectedCategory(categoryInput)
    setSelectedPriority(priorityInput)
    setSelectedStatus(statusInput)
    setSelectedOverdue(overdueInput)
  }

  function resetFilters() {
    setSearchInput('')
    setBranchInput('')
    setCategoryInput('')
    setPriorityInput('')
    setStatusInput('')
    setOverdueInput('')

    setSearch('')
    setSelectedBranch('')
    setSelectedCategory('')
    setSelectedPriority('')
    setSelectedStatus('')
    setSelectedOverdue('')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#e85d91]">
            Maintenance Control
          </p>

          <h1 className="dunkin-heading mt-1 text-3xl font-black">
            Maintenance Jobs
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Central maintenance job register
          </p>
        </div>

        <div className="dunkin-card p-8 text-sm text-slate-500">
          Loading maintenance jobs...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#e85d91]">
            Maintenance Control
          </p>

          <h1 className="dunkin-heading mt-1 text-3xl font-black">
            Maintenance Jobs
          </h1>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="font-black">
            Unable to load maintenance jobs
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
            Maintenance Control
          </p>

          <h1 className="dunkin-heading mt-1 text-3xl font-black">
            Maintenance Jobs
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Central maintenance job register and workflow tracking
          </p>
        </div>

        <Link
          href="/jobs/new"
          className="dunkin-primary inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black shadow-sm transition hover:shadow-md"
        >
          + New Maintenance Job
        </Link>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total Jobs
          </div>

          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            {totalJobs}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Open Jobs
          </div>

          <div className="mt-2 text-3xl font-black text-blue-600">
            {openJobs}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            In Progress
          </div>

          <div className="mt-2 text-3xl font-black text-orange-500">
            {inProgressJobs}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Critical
          </div>

          <div className="mt-2 text-3xl font-black text-red-600">
            {criticalJobs}
          </div>
        </div>

        <div className="dunkin-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Overdue
          </div>

          <div className="mt-2 text-3xl font-black text-red-600">
            {overdueJobs}
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

        <div className="grid gap-4 lg:grid-cols-3">

          {/* SEARCH */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#4a2633]">
              Search
            </label>

            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyFilters()
                }
              }}
              placeholder="Job no., problem, asset, contractor..."
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
              onChange={(e) => setBranchInput(e.target.value)}
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            >
              <option value="">
                All Branches
              </option>

              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
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
              onChange={(e) => setCategoryInput(e.target.value)}
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            >
              <option value="">
                All Categories
              </option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* PRIORITY */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#4a2633]">
              Priority
            </label>

            <select
              value={priorityInput}
              onChange={(e) => setPriorityInput(e.target.value)}
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            >
              <option value="">
                All Priorities
              </option>

              <option value="CRITICAL">
                CRITICAL
              </option>

              <option value="HIGH">
                HIGH
              </option>

              <option value="MEDIUM">
                MEDIUM
              </option>

              <option value="LOW">
                LOW
              </option>
            </select>
          </div>

          {/* STATUS */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#4a2633]">
              Status
            </label>

            <select
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            >
              <option value="">
                All Statuses
              </option>

              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* DUE DATE */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#4a2633]">
              Due Date
            </label>

            <select
              value={overdueInput}
              onChange={(e) => setOverdueInput(e.target.value)}
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
            >
              <option value="">
                All Jobs
              </option>

              <option value="OVERDUE">
                OVERDUE
              </option>

              <option value="NOT_OVERDUE">
                NOT OVERDUE
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
          Job Register
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </p>
      </div>

      {/* TABLE */}
      <div className="dunkin-card overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1500px] text-left">

            <thead className="bg-[#fff8fa]">

              <tr className="border-b border-[#f3dce5]">

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Job
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Branch
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Asset
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Category
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Priority
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Status
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Contractor
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Due
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Cost
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-[#f3dce5]">

              {filteredJobs.map((job) => {

                const overdue = isOverdue(job)

                return (
                  <tr
                    key={job.id}
                    className="transition hover:bg-[#fff8fa]"
                  >

                    {/* JOB */}
                    <td className="px-6 py-5">

                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex rounded-lg px-2 py-1 font-bold text-[#e85d91] transition hover:bg-[#fff0f5] hover:underline"
                      >
                        {job.job_number}
                      </Link>

                      <div className="mt-1 max-w-xs text-xs text-slate-500">
                        {job.problem_description}
                      </div>

                    </td>

                    {/* BRANCH */}
                    <td className="px-6 py-5">

                      <div className="font-bold text-[#4a2633]">
                        {job.branches?.branch_code ?? '-'}
                      </div>

                      <div className="text-xs text-slate-500">
                        {job.branches?.branch_name ?? '-'}
                      </div>

                    </td>

                    {/* ASSET */}
                    <td className="px-6 py-5">

                      <div className="font-bold text-slate-700">
                        {job.assets?.asset_code ?? '-'}
                      </div>

                      <div className="text-xs text-slate-500">
                        {job.assets?.asset_name ?? '-'}
                      </div>

                    </td>

                    {/* CATEGORY */}
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {job.category}
                    </td>

                    {/* PRIORITY */}
                    <td className="px-6 py-5">

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${priorityClass(
                          job.priority
                        )}`}
                      >
                        {job.priority}
                      </span>

                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-5">

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>

                    </td>

                    {/* CONTRACTOR */}
                    <td className="px-6 py-5">

                      <div className="font-bold text-slate-700">
                        {job.contractors?.contractor_code ?? '-'}
                      </div>

                      <div className="text-xs text-slate-500">
                        {job.contractors?.company_name ?? '-'}
                      </div>

                    </td>

                    {/* DUE */}
                    <td className="px-6 py-5">

                      <div
                        className={`text-sm font-bold ${
                          overdue
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatDate(job.due_at)}
                      </div>

                      {overdue && (
                        <div className="mt-1 text-xs font-black text-red-600">
                          OVERDUE
                        </div>
                      )}

                    </td>

                    {/* COST */}
                    <td className="px-6 py-5 text-sm text-slate-600">

                      {job.actual_cost != null
                        ? `RM ${Number(
                            job.actual_cost
                          ).toLocaleString('en-MY', {
                            minimumFractionDigits: 2,
                          })}`
                        : job.estimated_cost != null
                          ? `Est. RM ${Number(
                              job.estimated_cost
                            ).toLocaleString('en-MY', {
                              minimumFractionDigits: 2,
                            })}`
                          : '-'}

                    </td>

                  </tr>
                )
              })}

              {filteredJobs.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-16 text-center"
                  >
                    <div className="text-lg font-black text-[#4a2633]">
                      No maintenance jobs found
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