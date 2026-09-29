'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Asset = {
  id: string
  asset_code: string
  asset_name: string
  asset_category: string
  next_service_date: string | null
  last_service_date: string | null
  asset_status: string
  branches?: { branch_name: string; branch_code: string }[] | null
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function serviceState(date: string | null) {
  if (!date) return { label: 'NOT SCHEDULED', cls: 'bg-slate-100 text-slate-600' }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(`${date}T00:00:00`)
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { label: 'OVERDUE', cls: 'bg-red-100 text-red-700' }
  if (days <= 30) return { label: 'DUE SOON', cls: 'bg-yellow-100 text-yellow-700' }
  return { label: 'SCHEDULED', cls: 'bg-green-100 text-green-700' }
}

export default function PreventiveMaintenancePage() {
  const supabase = createClient()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('assets')
        .select('id, asset_code, asset_name, asset_category, next_service_date, last_service_date, asset_status, branches(branch_name, branch_code)')
        .order('next_service_date', { ascending: true, nullsFirst: false })
      if (error) setError(error.message)
      else setAssets((data ?? []) as unknown as Asset[])
      setLoading(false)
    }
    load()
  }, [])

  const rows = useMemo(() => assets.filter((asset) => {
    if (filter === 'ALL') return true
    return serviceState(asset.next_service_date).label === filter
  }), [assets, filter])

  const overdue = assets.filter((a) => serviceState(a.next_service_date).label === 'OVERDUE').length
  const dueSoon = assets.filter((a) => serviceState(a.next_service_date).label === 'DUE SOON').length
  const scheduled = assets.filter((a) => serviceState(a.next_service_date).label === 'SCHEDULED').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wider text-[#e85d91]">Assets</div>
          <h1 className="mt-1 text-3xl font-black text-[#4a2633]">Preventive Maintenance</h1>
          <p className="mt-2 text-sm text-slate-500">Monitor scheduled servicing and overdue asset maintenance.</p>
        </div>
        <Link href="/assets/new" className="rounded-xl bg-[#f582ae] px-4 py-3 text-sm font-bold text-white">+ Add Asset</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Total Assets', assets.length, 'ALL'],
          ['Scheduled', scheduled, 'SCHEDULED'],
          ['Due Soon', dueSoon, 'DUE SOON'],
          ['Overdue', overdue, 'OVERDUE'],
        ].map(([label, value, key]) => (
          <button key={String(key)} onClick={() => setFilter(String(key))} className={`dunkin-card p-5 text-left ${filter === key ? 'ring-2 ring-[#f582ae]' : ''}`}>
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-black text-[#4a2633]">{value}</div>
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="dunkin-card overflow-hidden">
        <div className="border-b border-[#f3dce5] p-5"><h2 className="font-black text-[#4a2633]">PM Schedule</h2></div>
        {loading ? <div className="p-6 text-sm text-slate-500">Loading...</div> : rows.length === 0 ? <div className="p-6 text-sm text-slate-500">No assets match this filter.</div> : (
          <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-[#fff8fa] text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Branch</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Last Service</th><th className="px-5 py-3">Next Service</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-[#f3dce5]">
            {rows.map((asset) => { const state = serviceState(asset.next_service_date); return <tr key={asset.id}>
              <td className="px-5 py-4"><Link href={`/assets/${asset.id}`} className="font-bold text-[#4a2633] hover:text-[#e85d91]">{asset.asset_code}</Link><div className="text-xs text-slate-500">{asset.asset_name}</div></td>
              <td className="px-5 py-4">{asset.branches?.[0]?.branch_name || '-'}</td><td className="px-5 py-4">{asset.asset_category}</td><td className="px-5 py-4">{formatDate(asset.last_service_date)}</td><td className="px-5 py-4 font-semibold">{formatDate(asset.next_service_date)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state.cls}`}>{state.label}</span></td><td className="px-5 py-4"><Link href={`/assets/${asset.id}/edit`} className="font-semibold text-[#e85d91]">Update</Link></td>
            </tr> })}
          </tbody></table></div>
        )}
      </div>
    </div>
  )
}
