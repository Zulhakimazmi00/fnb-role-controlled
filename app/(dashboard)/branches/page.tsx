import { createClient } from '@/lib/supabase/server'

export default async function BranchesPage() {
  const supabase = await createClient()

  const { data: branches, error } = await supabase
    .from('branches')
    .select('*')
    .order('branch_code')

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-xl bg-red-50 border border-red-200 p-6">
            <h1 className="text-lg font-bold text-red-800">
              Unable to load branches
            </h1>
            <p className="mt-2 text-sm text-red-700">
              {error.message}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const activeBranches =
    branches?.filter((branch) => branch.is_active).length ?? 0

  const inactiveBranches =
    branches?.filter((branch) => !branch.is_active).length ?? 0

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
        <p className="text-sm font-bold tracking-wider text-[#e85d91]">
        DUNKIN' MAINTENANCE
        </p>

        <h1 className="text-3xl font-bold text-[#4a2633] mt-1">
        Branches
        </h1>

            <p className="text-slate-500 mt-2">
              Manage all F&B outlets connected to the maintenance system.
            </p>
          </div>

        <button className="rounded-lg bg-[#f582ae] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#e85d91]">            + Add Branch
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">
              Total Branches
            </p>

            <p className="text-3xl font-bold text-slate-900 mt-2">
              {branches?.length ?? 0}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">
              Active Branches
            </p>

            <p className="text-3xl font-bold text-green-600 mt-2">
              {activeBranches}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">
              Inactive Branches
            </p>

            <p className="text-3xl font-bold text-slate-500 mt-2">
              {inactiveBranches}
            </p>
          </div>

        </div>

        {/* Branch Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">
              Branch Directory
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              {branches?.length ?? 0} branches found in the database.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">

              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Branch Code
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Branch Name
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                    City
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                    State
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Contact
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {branches?.map((branch) => (
                  <tr
                    key={branch.id}
                    className="hover:bg-slate-50"
                  >

                    <td className="px-6 py-5">
                      <span className="font-mono text-sm font-semibold text-[#e85d91]">
                        {branch.branch_code}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">
                        {branch.branch_name}
                      </p>

                      {branch.address && (
                        <p className="text-xs text-slate-500 mt-1">
                          {branch.address}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {branch.city || '-'}
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {branch.state || '-'}
                    </td>

                    <td className="px-6 py-5">
                      <p className="text-sm text-slate-700">
                        {branch.contact_person || '-'}
                      </p>

                      {branch.contact_phone && (
                        <p className="text-xs text-slate-500 mt-1">
                          {branch.contact_phone}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      {branch.is_active ? (
                        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>
          </div>

        </div>

        {/* Connection indicator */}
        <div className="mt-5 text-sm text-green-600">
          ● Connected to Supabase
        </div>

      </div>
    </main>
  )
}