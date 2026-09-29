'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Contractor = { id: string; contractor_code: string; company_name: string; is_active: boolean }
type Job = { id: string; contractor_id: string | null; status: string; priority: string; due_at: string | null; completed_at: string | null; reported_at: string }

function pct(n: number, d: number) { return d ? `${Math.round((n / d) * 100)}%` : '0%' }
function isClosed(status: string) { return ['CLOSED', 'COMPLETED'].includes(status) }
function isOverdue(job: Job) { return !!job.due_at && new Date(job.due_at).getTime() < Date.now() && !isClosed(job.status) }

export default function ContractorPerformancePage() {
  const supabase = createClient()
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: c, error: ce }, { data: j, error: je }] = await Promise.all([
        supabase.from('contractors').select('id, contractor_code, company_name, is_active').order('company_name'),
        supabase.from('maintenance_jobs').select('id, contractor_id, status, priority, due_at, completed_at, reported_at').not('contractor_id', 'is', null),
      ])
      if (ce || je) setError(ce?.message || je?.message || 'Unable to load performance data.')
      setContractors((c ?? []) as Contractor[]); setJobs((j ?? []) as Job[]); setLoading(false)
    }
    load()
  }, [])

  const rows = useMemo(() => contractors.map((c) => {
    const assigned = jobs.filter((j) => j.contractor_id === c.id)
    const completed = assigned.filter((j) => isClosed(j.status)).length
    const overdue = assigned.filter(isOverdue).length
    const critical = assigned.filter((j) => j.priority === 'CRITICAL').length
    return { ...c, assigned: assigned.length, completed, overdue, critical, completionRate: pct(completed, assigned.length), overdueRate: pct(overdue, assigned.length) }
  }), [contractors, jobs])

  return <div className="space-y-6">
    <div><div className="text-sm font-semibold uppercase tracking-wider text-[#e85d91]">Contractors</div><h1 className="mt-1 text-3xl font-black text-[#4a2633]">Contractor Performance</h1><p className="mt-2 text-sm text-slate-500">Operational metrics based on maintenance jobs currently recorded in the system.</p></div>
    {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="dunkin-card overflow-hidden"><div className="border-b border-[#f3dce5] p-5"><h2 className="font-black text-[#4a2633]">Performance Register</h2></div>
      {loading ? <div className="p-6 text-sm text-slate-500">Loading...</div> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-[#fff8fa] text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Contractor</th><th className="px-5 py-3">Assigned</th><th className="px-5 py-3">Completed</th><th className="px-5 py-3">Completion Rate</th><th className="px-5 py-3">Overdue</th><th className="px-5 py-3">Overdue Rate</th><th className="px-5 py-3">Critical</th></tr></thead><tbody className="divide-y divide-[#f3dce5]">
        {rows.map((row) => <tr key={row.id}><td className="px-5 py-4"><Link href={`/contractors/${row.id}`} className="font-bold text-[#4a2633] hover:text-[#e85d91]">{row.company_name}</Link><div className="text-xs text-slate-500">{row.contractor_code}{!row.is_active && ' · INACTIVE'}</div></td><td className="px-5 py-4">{row.assigned}</td><td className="px-5 py-4">{row.completed}</td><td className="px-5 py-4 font-bold">{row.completionRate}</td><td className="px-5 py-4 text-red-700">{row.overdue}</td><td className="px-5 py-4">{row.overdueRate}</td><td className="px-5 py-4">{row.critical}</td></tr>)}
      </tbody></table></div>}
    </div>
  </div>
}
