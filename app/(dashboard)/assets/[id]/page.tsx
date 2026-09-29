import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function getWarrantyStatus(expiry: string | null) {
  if (!expiry) {
    return {
      label: 'NOT APPLICABLE',
      className: 'bg-slate-100 text-slate-600',
    }
  }

  const expiryDate = new Date(`${expiry}T23:59:59`)
  const today = new Date()

  if (expiryDate < today) {
    return {
      label: 'EXPIRED',
      className: 'bg-red-100 text-red-700',
    }
  }

  const daysRemaining = Math.ceil(
    (expiryDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  )

  if (daysRemaining <= 90) {
    return {
      label: 'EXPIRING SOON',
      className: 'bg-orange-100 text-orange-700',
    }
  }

  return {
    label: 'ACTIVE',
    className: 'bg-green-100 text-green-700',
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

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return 'RM 0.00'

  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
  }).format(value)
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data: asset, error } = await supabase
    .from('assets')
    .select(`
      *,
      branches (
        branch_name,
        branch_code,
        address,
        city,
        state
      ),
      contractors (
        company_name,
        contractor_code,
        contact_person,
        contact_phone,
        contact_email
      )
    `)
    .eq('id', id)
    .single()

  if (error || !asset) {
    notFound()
  }

  const { data: jobs } = await supabase
    .from('maintenance_jobs')
    .select(`
      id,
      job_number,
      category,
      priority,
      status,
      problem_description,
      reported_at,
      completed_at,
      actual_cost
    `)
    .eq('asset_id', id)
    .order('reported_at', {
      ascending: false,
    })

  const allJobs = jobs ?? []

  const warranty = getWarrantyStatus(
    asset.warranty_expiry
  )

  const totalMaintenanceCost = allJobs.reduce(
    (total, job) =>
      total + Number(job.actual_cost ?? 0),
    0
  )

  return (
    <div className="space-y-8">

      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

        <div>

          <div className="mb-2 text-sm font-semibold text-slate-500">
            <Link
              href="/assets"
              className="text-[#e85d91] hover:underline"
            >
              Assets
            </Link>

            <span className="mx-2">/</span>

            {asset.asset_code}
          </div>

          <h1 className="dunkin-heading text-3xl font-black">
            {asset.asset_name}
          </h1>

          <div className="mt-2 flex flex-wrap gap-2">

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {asset.asset_code}
            </span>

            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
              {asset.asset_status}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${warranty.className}`}
            >
              {warranty.label}
            </span>

          </div>

        </div>


        <Link
          href="/assets"
          className="rounded-xl border border-[#f3dce5] bg-white px-5 py-3 text-sm font-black text-[#4a2633] hover:bg-[#fff8fa]"
        >
          ← Back to Assets
        </Link>

      </div>


      {/* KPI */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="dunkin-card p-5">

          <div className="text-sm font-semibold text-slate-500">
            Maintenance Jobs
          </div>

          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            {allJobs.length}
          </div>

        </div>


        <div className="dunkin-card p-5">

          <div className="text-sm font-semibold text-slate-500">
            Maintenance Cost
          </div>

          <div className="mt-2 text-2xl font-black text-[#e85d91]">
            {formatCurrency(totalMaintenanceCost)}
          </div>

        </div>


        <div className="dunkin-card p-5">

          <div className="text-sm font-semibold text-slate-500">
            Warranty Expiry
          </div>

          <div className="mt-2 text-xl font-black text-[#4a2633]">
            {formatDate(asset.warranty_expiry)}
          </div>

        </div>


        <div className="dunkin-card p-5">

          <div className="text-sm font-semibold text-slate-500">
            Next Service
          </div>

          <div className="mt-2 text-xl font-black text-[#4a2633]">
            {formatDate(asset.next_service_date)}
          </div>

        </div>

      </div>


      {/* ASSET INFORMATION */}

      <div className="grid gap-6 lg:grid-cols-2">

        <div className="dunkin-card p-6">

          <h2 className="text-lg font-black text-[#4a2633]">
            Asset Information
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">

            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Asset Code
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {asset.asset_code}
              </div>
            </div>


            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Category
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {asset.asset_category}
              </div>
            </div>


            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Manufacturer
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {asset.manufacturer ?? '-'}
              </div>
            </div>


            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Model
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {asset.model ?? '-'}
              </div>
            </div>


            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Serial Number
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {asset.serial_number ?? '-'}
              </div>
            </div>


            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Installation Date
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {formatDate(asset.installation_date)}
              </div>
            </div>

          </div>

        </div>


        {/* BRANCH */}

        <div className="dunkin-card p-6">

          <h2 className="text-lg font-black text-[#4a2633]">
            Branch Location
          </h2>

          <div className="mt-6">

            <div className="text-xl font-black text-[#4a2633]">
              {asset.branches?.branch_name ?? '-'}
            </div>

            <div className="mt-1 text-sm font-bold text-[#e85d91]">
              {asset.branches?.branch_code ?? ''}
            </div>

            <div className="mt-4 text-sm leading-6 text-slate-600">
              {asset.branches?.address ?? '-'}
            </div>

            <div className="mt-2 text-sm text-slate-500">
              {asset.branches?.city ?? ''}
              {asset.branches?.state
                ? `, ${asset.branches.state}`
                : ''}
            </div>

          </div>

        </div>

      </div>


      {/* WARRANTY */}

      <div className="dunkin-card overflow-hidden">

        <div className="border-b border-[#f3dce5] px-6 py-5">

          <h2 className="text-lg font-black text-[#4a2633]">
            Warranty Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Warranty coverage associated with this equipment
          </p>

        </div>


        <div className="grid gap-6 p-6 md:grid-cols-3">

          <div>

            <div className="text-xs font-black uppercase tracking-wide text-slate-400">
              Status
            </div>

            <div className="mt-2">

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${warranty.className}`}
              >
                {warranty.label}
              </span>

            </div>

          </div>


          <div>

            <div className="text-xs font-black uppercase tracking-wide text-slate-400">
              Warranty Expiry
            </div>

            <div className="mt-2 text-lg font-black text-[#4a2633]">
              {formatDate(asset.warranty_expiry)}
            </div>

          </div>


          <div>

            <div className="text-xs font-black uppercase tracking-wide text-slate-400">
              Warranty Contractor
            </div>

            <div className="mt-2 font-bold text-slate-700">
              {asset.contractors?.company_name ??
                'Not Assigned'}
            </div>

            {asset.contractors?.contractor_code && (
              <div className="mt-1 text-xs text-slate-400">
                {asset.contractors.contractor_code}
              </div>
            )}

          </div>

        </div>

      </div>


      {/* CONTRACTOR */}

      <div className="dunkin-card p-6">

        <h2 className="text-lg font-black text-[#4a2633]">
          Service Contractor
        </h2>

        {asset.contractors ? (

          <div className="mt-5 grid gap-5 md:grid-cols-4">

            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Company
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {asset.contractors.company_name}
              </div>
            </div>


            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Contact Person
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {asset.contractors.contact_person ?? '-'}
              </div>
            </div>


            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Phone
              </div>

              <div className="mt-1 font-bold text-slate-700">
                {asset.contractors.contact_phone ?? '-'}
              </div>
            </div>


            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Email
              </div>

              <div className="mt-1 break-all font-bold text-slate-700">
                {asset.contractors.contact_email ?? '-'}
              </div>
            </div>

          </div>

        ) : (

          <p className="mt-4 text-sm text-slate-500">
            No service contractor is currently assigned.
          </p>

        )}

      </div>


      {/* MAINTENANCE HISTORY */}

      <div className="dunkin-card overflow-hidden">

        <div className="border-b border-[#f3dce5] px-6 py-5">

          <h2 className="text-lg font-black text-[#4a2633]">
            Maintenance History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Complete maintenance job history for this asset
          </p>

        </div>


        {allJobs.length === 0 ? (

          <div className="px-6 py-12 text-center">

            <div className="font-black text-[#4a2633]">
              No maintenance history
            </div>

            <p className="mt-2 text-sm text-slate-500">
              No maintenance jobs have been linked to this asset.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1000px] text-left">

              <thead className="bg-[#fff8fa]">

                <tr className="border-b border-[#f3dce5]">

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Job
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
                    Reported
                  </th>

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Completed
                  </th>

                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Actual Cost
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-[#f3dce5]">

                {allJobs.map((job) => (

                  <tr
                    key={job.id}
                    className="transition hover:bg-[#fff8fa]"
                  >

                    <td className="px-6 py-5">

                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-bold text-[#e85d91] hover:underline"
                      >
                        {job.job_number}
                      </Link>

                      <div className="mt-1 max-w-[300px] text-xs text-slate-400">
                        {job.problem_description}
                      </div>

                    </td>


                    <td className="px-6 py-5">

                      <span className="text-xs font-black text-slate-600">
                        {job.category}
                      </span>

                    </td>


                    <td className="px-6 py-5">

                      <span className="text-xs font-black text-slate-600">
                        {job.priority}
                      </span>

                    </td>


                    <td className="px-6 py-5">

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {job.status}
                      </span>

                    </td>


                    <td className="px-6 py-5 text-sm text-slate-600">
                      {formatDate(job.reported_at)}
                    </td>


                    <td className="px-6 py-5 text-sm text-slate-600">
                      {formatDate(job.completed_at)}
                    </td>


                    <td className="px-6 py-5">

                      <span className="font-bold text-slate-700">
                        {formatCurrency(
                          job.actual_cost
                        )}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* NOTES */}

      {asset.notes && (

        <div className="dunkin-card p-6">

          <h2 className="text-lg font-black text-[#4a2633]">
            Notes
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {asset.notes}
          </p>

        </div>

      )}

    </div>
  )
}