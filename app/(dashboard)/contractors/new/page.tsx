'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SERVICE_CATEGORIES = [
  'AIR CONDITIONING',
  'REFRIGERATION',
  'ELECTRICAL',
  'PLUMBING',
  'KITCHEN EQUIPMENT',
  'FIRE PROTECTION',
  'BUILDING / CIVIL',
  'IT / NETWORK',
  'PEST CONTROL',
  'CLEANING',
  'GENERAL MAINTENANCE',
]

const STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Penang',
  'Perak',
  'Perlis',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Kuala Lumpur',
  'Putrajaya',
  'Labuan',
]

export default function NewContractorPage() {
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState({
    contractor_code: '',
    company_name: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    city: '',
    state: '',
    service_category: '',
    coverage_area: '',
    response_sla_hours: '',
    completion_sla_hours: '',
    is_active: true,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateField(
    field: keyof typeof form,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setSaving(true)
    setError('')

    if (
      !form.contractor_code.trim() ||
      !form.company_name.trim()
    ) {
      setError(
        'Contractor Code and Company Name are required.'
      )
      setSaving(false)
      return
    }

    const responseSla = form.response_sla_hours
      ? Number(form.response_sla_hours)
      : null

    const completionSla = form.completion_sla_hours
      ? Number(form.completion_sla_hours)
      : null

    if (
      responseSla !== null &&
      (!Number.isFinite(responseSla) || responseSla < 0)
    ) {
      setError(
        'Response SLA must be a valid positive number.'
      )
      setSaving(false)
      return
    }

    if (
      completionSla !== null &&
      (!Number.isFinite(completionSla) || completionSla < 0)
    ) {
      setError(
        'Completion SLA must be a valid positive number.'
      )
      setSaving(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('contractors')
      .insert({
        contractor_code:
          form.contractor_code.trim().toUpperCase(),

        company_name:
          form.company_name.trim(),

        contact_person:
          form.contact_person.trim() || null,

        contact_phone:
          form.contact_phone.trim() || null,

        contact_email:
          form.contact_email.trim() || null,

        address:
          form.address.trim() || null,

        city:
          form.city.trim() || null,

        state:
          form.state || null,

        service_category:
          form.service_category || null,

        coverage_area:
          form.coverage_area.trim() || null,

        response_sla_hours:
          responseSla,

        completion_sla_hours:
          completionSla,

        is_active:
          form.is_active,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push(`/contractors/${data.id}`)
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <Link
          href="/contractors"
          className="text-sm font-bold text-[#e85d91] hover:underline"
        >
          ← Back to Contractor Register
        </Link>

        <p className="mt-5 text-sm font-bold uppercase tracking-wide text-[#e85d91]">
          Contractor Management
        </p>

        <h1 className="dunkin-heading mt-1 text-3xl font-black">
          Add Contractor
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Register a new maintenance contractor into the HQ system.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="font-black">
            Unable to save contractor
          </div>

          <div className="mt-1 text-sm">
            {error}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* COMPANY INFORMATION */}
        <section className="dunkin-card p-6">

          <h2 className="text-lg font-black text-[#4a2633]">
            Company Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Basic contractor identification and company details.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">

            {/* Contractor Code */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Contractor Code *
              </label>

              <input
                type="text"
                value={form.contractor_code}
                onChange={(e) =>
                  updateField(
                    'contractor_code',
                    e.target.value
                  )
                }
                placeholder="e.g. CTR-004"
                required
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm uppercase outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />

              <p className="mt-1 text-xs text-slate-400">
                Must be unique.
              </p>
            </div>

            {/* Company Name */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Company Name *
              </label>

              <input
                type="text"
                value={form.company_name}
                onChange={(e) =>
                  updateField(
                    'company_name',
                    e.target.value
                  )
                }
                placeholder="e.g. ABC Engineering Sdn Bhd"
                required
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Registered Address
              </label>

              <textarea
                value={form.address}
                onChange={(e) =>
                  updateField(
                    'address',
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Company registered address"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            {/* City */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                City
              </label>

              <input
                type="text"
                value={form.city}
                onChange={(e) =>
                  updateField(
                    'city',
                    e.target.value
                  )
                }
                placeholder="e.g. Petaling Jaya"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            {/* State */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                State
              </label>

              <select
                value={form.state}
                onChange={(e) =>
                  updateField(
                    'state',
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              >
                <option value="">
                  Select State
                </option>

                {STATES.map((state) => (
                  <option
                    key={state}
                    value={state}
                  >
                    {state}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </section>

        {/* CONTACT */}
        <section className="dunkin-card p-6">

          <h2 className="text-lg font-black text-[#4a2633]">
            Contact Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Primary contact information for maintenance coordination.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-3">

            {/* Contact Person */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Contact Person
              </label>

              <input
                type="text"
                value={form.contact_person}
                onChange={(e) =>
                  updateField(
                    'contact_person',
                    e.target.value
                  )
                }
                placeholder="Full name"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Phone
              </label>

              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) =>
                  updateField(
                    'contact_phone',
                    e.target.value
                  )
                }
                placeholder="e.g. 012-3456789"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Email
              </label>

              <input
                type="email"
                value={form.contact_email}
                onChange={(e) =>
                  updateField(
                    'contact_email',
                    e.target.value
                  )
                }
                placeholder="contractor@example.com"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

          </div>
        </section>

        {/* SERVICE */}
        <section className="dunkin-card p-6">

          <h2 className="text-lg font-black text-[#4a2633]">
            Service Coverage
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Define the contractor&apos;s maintenance capabilities and service area.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">

            {/* Service Category */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Primary Service Category
              </label>

              <select
                value={form.service_category}
                onChange={(e) =>
                  updateField(
                    'service_category',
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              >
                <option value="">
                  Select Service
                </option>

                {SERVICE_CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>

              <p className="mt-1 text-xs text-slate-400">
                Additional service categories can be added later.
              </p>
            </div>

            {/* Coverage Area */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Coverage Area
              </label>

              <input
                type="text"
                value={form.coverage_area}
                onChange={(e) =>
                  updateField(
                    'coverage_area',
                    e.target.value
                  )
                }
                placeholder="e.g. Klang Valley, Selangor, KL"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />
            </div>

          </div>
        </section>

        {/* SLA */}
        <section className="dunkin-card p-6">

          <h2 className="text-lg font-black text-[#4a2633]">
            Service Level Agreement
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Define the contractor&apos;s response and completion targets.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">

            {/* Response SLA */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Response SLA (Hours)
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={form.response_sla_hours}
                onChange={(e) =>
                  updateField(
                    'response_sla_hours',
                    e.target.value
                  )
                }
                placeholder="e.g. 4"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />

              <p className="mt-1 text-xs text-slate-400">
                Target time for contractor acknowledgement / response.
              </p>
            </div>

            {/* Completion SLA */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4a2633]">
                Completion SLA (Hours)
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={form.completion_sla_hours}
                onChange={(e) =>
                  updateField(
                    'completion_sla_hours',
                    e.target.value
                  )
                }
                placeholder="e.g. 24"
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae] focus:ring-2 focus:ring-[#f582ae]/20"
              />

              <p className="mt-1 text-xs text-slate-400">
                Target time for completing the maintenance job.
              </p>
            </div>

          </div>
        </section>

        {/* STATUS */}
        <section className="dunkin-card p-6">

          <h2 className="text-lg font-black text-[#4a2633]">
            Contractor Status
          </h2>

          <div className="mt-5 flex items-center gap-4">

            <button
              type="button"
              onClick={() =>
                updateField(
                  'is_active',
                  !form.is_active
                )
              }
              className={`relative h-7 w-12 rounded-full transition ${
                form.is_active
                  ? 'bg-[#f582ae]'
                  : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  form.is_active
                    ? 'left-6'
                    : 'left-1'
                }`}
              />
            </button>

            <div>
              <div className="font-bold text-[#4a2633]">
                {form.is_active
                  ? 'Active Contractor'
                  : 'Inactive Contractor'}
              </div>

              <div className="text-sm text-slate-500">
                {form.is_active
                  ? 'Contractor can be assigned to maintenance jobs.'
                  : 'Contractor will not be available for new assignments.'}
              </div>
            </div>

          </div>
        </section>

        {/* ACTIONS */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

          <Link
            href="/contractors"
            className="rounded-xl border border-[#f3dce5] bg-white px-6 py-3 text-center text-sm font-black text-[#4a2633] transition hover:bg-[#fff8fa]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="dunkin-primary rounded-xl px-7 py-3 text-sm font-black shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? 'Saving Contractor...'
              : 'Save Contractor'}
          </button>

        </div>

      </form>
    </div>
  )
}