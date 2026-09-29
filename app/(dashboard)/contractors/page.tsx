'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Contractor = {
  id: string
  contractor_code: string
  company_name: string
  contact_person: string | null
  contact_phone: string | null
  contact_email: string | null
  address: string | null
  city: string | null
  state: string | null
  service_category: string | null
  coverage_area: string | null
  response_sla_hours: number | null
  completion_sla_hours: number | null
  is_active: boolean
}

export default function ContractorsPage() {
  const supabase = createClient()

  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [serviceInput, setServiceInput] = useState('')
  const [statusInput, setStatusInput] = useState('')

  const [search, setSearch] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    async function loadContractors() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .order('company_name')

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setContractors((data ?? []) as Contractor[])
      setLoading(false)
    }

    loadContractors()
  }, [])

  const services = useMemo(() => {
    const values = contractors
      .flatMap((contractor) =>
        (contractor.service_category ?? '')
          .split(',')
          .map((item) => item.trim())
      )
      .filter(Boolean)

    return Array.from(new Set(values)).sort()
  }, [contractors])

  const filteredContractors = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return contractors.filter((contractor) => {
      const matchesSearch =
        !searchText ||
        contractor.contractor_code.toLowerCase().includes(searchText) ||
        contractor.company_name.toLowerCase().includes(searchText) ||
        (contractor.contact_person ?? '').toLowerCase().includes(searchText) ||
        (contractor.contact_phone ?? '').toLowerCase().includes(searchText) ||
        (contractor.contact_email ?? '').toLowerCase().includes(searchText) ||
        (contractor.service_category ?? '').toLowerCase().includes(searchText) ||
        (contractor.coverage_area ?? '').toLowerCase().includes(searchText) ||
        (contractor.city ?? '').toLowerCase().includes(searchText) ||
        (contractor.state ?? '').toLowerCase().includes(searchText)

      const matchesService =
        !selectedService ||
        (contractor.service_category ?? '')
          .split(',')
          .map((item) => item.trim())
          .includes(selectedService)

      const matchesStatus =
        !selectedStatus ||
        (selectedStatus === 'ACTIVE' && contractor.is_active) ||
        (selectedStatus === 'INACTIVE' && !contractor.is_active)

      return matchesSearch && matchesService && matchesStatus
    })
  }, [contractors, search, selectedService, selectedStatus])

  const totalContractors = filteredContractors.length

  const activeContractors = filteredContractors.filter(
    (contractor) => contractor.is_active
  ).length

  const inactiveContractors = filteredContractors.filter(
    (contractor) => !contractor.is_active
  ).length

  function applyFilters() {
    setSearch(searchInput)
    setSelectedService(serviceInput)
    setSelectedStatus(statusInput)
  }

  function resetFilters() {
    setSearchInput('')
    setServiceInput('')
    setStatusInput('')

    setSearch('')
    setSelectedService('')
    setSelectedStatus('')
  }

  return (
    <main className="min-h-screen bg-[#fff8fa] p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#f58220]">
              DUNKIN&apos; MAINTENANCE
            </p>

            <h1 className="text-3xl font-bold text-[#4a2633]">
              Contractor Register
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage approved maintenance contractors and service coverage.
            </p>
          </div>

          <Link
            href="/contractors/new"
            className="inline-flex items-center justify-center rounded-xl bg-[#f582ae] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e85d91]"
          >
            + Add Contractor
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="dunkin-card p-5">
            <p className="text-sm font-medium text-gray-500">
              Total Contractors
            </p>
            <p className="mt-2 text-3xl font-bold text-[#4a2633]">
              {totalContractors}
            </p>
          </div>

          <div className="dunkin-card p-5">
            <p className="text-sm font-medium text-gray-500">
              Active
            </p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {activeContractors}
            </p>
          </div>

          <div className="dunkin-card p-5">
            <p className="text-sm font-medium text-gray-500">
              Inactive
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-500">
              {inactiveContractors}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="dunkin-card p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4a2633]">
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
                placeholder="Code, company, contact..."
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4a2633]">
                Service Category
              </label>

              <select
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
              >
                <option value="">All Services</option>

                {services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4a2633]">
                Status
              </label>

              <select
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 rounded-xl bg-[#f582ae] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e85d91]"
              >
                Apply Filters
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm font-semibold text-[#4a2633] hover:bg-[#fff8fa]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredContractors.length} of {contractors.length} contractors
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="dunkin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">

              <thead className="bg-[#fff0f5]">
                <tr className="border-b border-[#f3dce5]">
                  <th className="px-5 py-4 text-left font-semibold text-[#4a2633]">
                    Contractor
                  </th>

                  <th className="px-5 py-4 text-left font-semibold text-[#4a2633]">
                    Contact
                  </th>

                  <th className="px-5 py-4 text-left font-semibold text-[#4a2633]">
                    Service
                  </th>

                  <th className="px-5 py-4 text-left font-semibold text-[#4a2633]">
                    Coverage
                  </th>

                  <th className="px-5 py-4 text-left font-semibold text-[#4a2633]">
                    Response SLA
                  </th>

                  <th className="px-5 py-4 text-left font-semibold text-[#4a2633]">
                    Completion SLA
                  </th>

                  <th className="px-5 py-4 text-left font-semibold text-[#4a2633]">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f3dce5]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Loading contractors...
                    </td>
                  </tr>
                ) : filteredContractors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      No contractors found.
                    </td>
                  </tr>
                ) : (
                  filteredContractors.map((contractor) => (
                    <tr
                      key={contractor.id}
                      className="transition hover:bg-[#fff8fa]"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/contractors/${contractor.id}`}
                          className="font-semibold text-[#e85d91] hover:underline"
                        >
                          {contractor.contractor_code}
                        </Link>

                        <div className="mt-1 font-medium text-[#4a2633]">
                          {contractor.company_name}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-[#4a2633]">
                          {contractor.contact_person || '-'}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {contractor.contact_phone || '-'}
                        </div>

                        <div className="text-xs text-gray-500">
                          {contractor.contact_email || '-'}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {contractor.service_category || '-'}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {contractor.coverage_area || '-'}
                      </td>

                      <td className="px-5 py-4">
                        {contractor.response_sla_hours != null
                          ? `${contractor.response_sla_hours} hrs`
                          : '-'}
                      </td>

                      <td className="px-5 py-4">
                        {contractor.completion_sla_hours != null
                          ? `${contractor.completion_sla_hours} hrs`
                          : '-'}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            contractor.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {contractor.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  )
}