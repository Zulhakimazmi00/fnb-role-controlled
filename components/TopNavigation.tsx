'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role =
  | 'MANAGEMENT'
  | 'HQ_ADMIN'
  | 'HQ_MAINTENANCE'
  | 'FINANCE'
  | 'CONTRACTOR'
  | 'BRANCH_USER'

type NavItem = {
  label: string
  href: string
  roles: Role[]
}

type NavGroup = {
  label: string
  items: NavItem[]
}

type Props = {
  role: Role
  fullName: string
  email: string
}

const navigation: NavGroup[] = [
  {
    label: 'My Work',
    items: [
      { label: 'Assigned Jobs', href: '/contractor/jobs', roles: ['CONTRACTOR'] },
    ],
  },
  {
    label: 'My Branch',
    items: [
      { label: 'My Maintenance Jobs', href: '/branch/jobs', roles: ['BRANCH_USER'] },
      { label: 'New Maintenance Request', href: '/branch/jobs/new', roles: ['BRANCH_USER'] },
    ],
  },
  {
    label: 'Maintenance',
    items: [
      { label: 'Work Register', href: '/jobs', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE'] },
      { label: 'New Maintenance Job', href: '/jobs/new', roles: ['HQ_ADMIN', 'HQ_MAINTENANCE'] },
      { label: 'Maintenance Workflow', href: '/jobs', roles: ['HQ_ADMIN', 'HQ_MAINTENANCE'] },
    ],
  },
  {
    label: 'Assets',
    items: [
      { label: 'Asset Register', href: '/assets', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE'] },
      { label: 'Add Asset', href: '/assets/new', roles: ['HQ_ADMIN', 'HQ_MAINTENANCE'] },
      { label: 'Preventive Maintenance', href: '/preventive-maintenance', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE'] },
    ],
  },
  {
    label: 'Contractors',
    items: [
      { label: 'Contractor Register', href: '/contractors', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE', 'FINANCE'] },
      { label: 'Add Contractor', href: '/contractors/new', roles: ['HQ_ADMIN'] },
      { label: 'Contractor Performance', href: '/contractor-performance', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Quotations', href: '/finance/quotations', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE', 'FINANCE', 'CONTRACTOR'] },
      { label: 'Purchase Orders', href: '/finance/purchase-orders', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE', 'FINANCE'] },
      { label: 'Invoices', href: '/finance/invoices', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE', 'FINANCE'] },
      { label: 'Payments', href: '/finance/payments', roles: ['HQ_ADMIN', 'MANAGEMENT', 'FINANCE'] },
      { label: 'Financial Reports', href: '/finance/reports', roles: ['HQ_ADMIN', 'MANAGEMENT', 'FINANCE'] },
    ],
  },
  {
    label: 'Branches',
    items: [
      { label: 'Branch Register', href: '/branches', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE'] },
      { label: 'Branch Requests', href: '/branch/requests', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE'] },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Maintenance Reports', href: '/reports/maintenance', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE'] },
      { label: 'Cost Reports', href: '/reports/cost', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE', 'FINANCE'] },
      { label: 'SLA Reports', href: '/reports/sla', roles: ['HQ_ADMIN', 'MANAGEMENT', 'HQ_MAINTENANCE'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', href: '/admin/users', roles: ['HQ_ADMIN'] },
      { label: 'Settings', href: '/settings', roles: ['HQ_ADMIN'] },
      { label: 'Audit Trail', href: '/admin/audit', roles: ['HQ_ADMIN', 'MANAGEMENT'] },
    ],
  },
] as NavGroup[]

function getVisibleGroups(role: Role) {
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}

function roleLabel(role: Role) {
  switch (role) {
    case 'HQ_ADMIN':
      return 'HQ Administrator'
    case 'HQ_MAINTENANCE':
      return 'HQ Maintenance'
    case 'MANAGEMENT':
      return 'Management'
    case 'FINANCE':
      return 'Finance'
    case 'CONTRACTOR':
      return 'Contractor'
    case 'BRANCH_USER':
      return 'Branch User'
    default:
      return role
  }
}

export default function TopNavigation({
  role,
  fullName,
  email,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  const groups = getVisibleGroups(role)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        navRef.current &&
        !navRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function toggleMenu(label: string) {
    setOpenMenu((current) =>
      current === label ? null : label
    )
  }
  async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/login')
  router.refresh()
}
  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 border-b bg-white shadow-sm"
    >
      <div className="dunkin-gradient">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-3 text-white"
            onClick={() => setOpenMenu(null)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black text-[#f582ae]">
              D
            </div>

            <div>
              <div className="text-lg font-black tracking-wide">
                DUNKIN&apos; MAINTENANCE
              </div>
              <div className="text-[10px] font-semibold tracking-[0.25em] text-white/90">
                HQ CONTROL TOWER
              </div>
            </div>
          </Link>

         <div className="hidden items-center gap-3 md:flex">
          <div className="text-right text-white">
           <div className="text-sm font-bold">
               {fullName || 'User'}
            </div>

        <div className="text-xs text-white/80">
          {roleLabel(role)}
      </div>
    </div>

  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold text-[#4a2633]">
    {(fullName || email || 'U')
      .charAt(0)
      .toUpperCase()}
  </div>

  <button
    type="button"
    onClick={handleLogout}
    className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white hover:text-[#e85d91]"
  >
    Logout
  </button>
</div>

          <button
            type="button"
            className="rounded-lg bg-white/20 px-3 py-2 text-sm font-bold text-white md:hidden"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      <div className="hidden border-t bg-white md:block">
        <div className="mx-auto flex max-w-[1600px] items-center gap-1 px-6">
          <Link
            href="/"
            className="px-4 py-3 text-sm font-bold text-[#4a2633] hover:bg-[#fff1f6]"
            onClick={() => setOpenMenu(null)}
          >
            Dashboard
          </Link>

          {groups.map((group) => {
            const isOpen = openMenu === group.label

            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu(group.label)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition ${
                    isOpen
                      ? 'bg-[#fff1f6] text-[#e85d91]'
                      : 'text-[#4a2633] hover:bg-[#fff1f6]'
                  }`}
                >
                  {group.label}
                  <span
                    className={`text-xs transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div className="absolute left-0 top-full min-w-[230px] rounded-b-xl border border-[#f3dce5] bg-white py-2 shadow-xl">
                    {group.items.map((item) => (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        onClick={() => setOpenMenu(null)}
                        className="block px-5 py-3 text-sm font-semibold text-[#4a2633] hover:bg-[#fff1f6] hover:text-[#e85d91]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-white px-4 py-4 md:hidden">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="mb-2 block rounded-lg px-4 py-3 font-bold text-[#4a2633] hover:bg-[#fff1f6]"
          >
            Dashboard
          </Link>

          {groups.map((group) => (
            <details
              key={group.label}
              className="border-t border-[#f3dce5]"
            >
              <summary className="cursor-pointer px-4 py-3 font-bold text-[#4a2633]">
                {group.label}
              </summary>

              <div className="pb-2">
                {group.items.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-7 py-2 text-sm text-[#4a2633] hover:bg-[#fff1f6]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </header>
  )
}

