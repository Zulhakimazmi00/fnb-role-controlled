'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Role =
  | 'MANAGEMENT'
  | 'HQ_ADMIN'
  | 'HQ_MAINTENANCE'
  | 'FINANCE'
  | 'CONTRACTOR'
  | 'BRANCH_USER'

type UserProfile = {
  id: string
  full_name: string
  email: string | null
  role: Role
  phone: string | null
  is_active: boolean
  branch_id: string | null
  contractor_id: string | null

  branches: {
    branch_code: string
    branch_name: string
  } | null

  contractors: {
    contractor_code: string
    company_name: string
  } | null
}

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

const roles: Role[] = [
  'MANAGEMENT',
  'HQ_ADMIN',
  'HQ_MAINTENANCE',
  'FINANCE',
  'CONTRACTOR',
  'BRANCH_USER',
]

function roleLabel(role: Role) {
  switch (role) {
    case 'HQ_ADMIN':
      return 'HQ Administrator'
    case 'HQ_MAINTENANCE':
      return 'HQ Maintenance'
    case 'BRANCH_USER':
      return 'Branch User'
    case 'CONTRACTOR':
      return 'Contractor'
    case 'MANAGEMENT':
      return 'Management'
    case 'FINANCE':
      return 'Finance'
    default:
      return role
  }
}

function roleClass(role: Role) {
  switch (role) {
    case 'HQ_ADMIN':
      return 'bg-purple-100 text-purple-700'
    case 'HQ_MAINTENANCE':
      return 'bg-blue-100 text-blue-700'
    case 'MANAGEMENT':
      return 'bg-slate-100 text-slate-700'
    case 'FINANCE':
      return 'bg-green-100 text-green-700'
    case 'CONTRACTOR':
      return 'bg-orange-100 text-orange-700'
    case 'BRANCH_USER':
      return 'bg-pink-100 text-pink-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export default function AdminUsersPage() {
  const supabase = createClient()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showCreateForm, setShowCreateForm] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'BRANCH_USER' as Role,
    phone: '',
    branch_id: '',
    contractor_id: '',
    is_active: true,
  })

  async function loadUsers() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        phone,
        is_active,
        branch_id,
        contractor_id,
        branches (
          branch_code,
          branch_name
        ),
        contractors (
          contractor_code,
          company_name
        )
      `)
      .order('full_name', { ascending: true })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const normalizedUsers: UserProfile[] = (data ?? []).map((item) => ({
      ...item,
      branches: Array.isArray(item.branches)
        ? item.branches[0] ?? null
        : item.branches ?? null,
      contractors: Array.isArray(item.contractors)
        ? item.contractors[0] ?? null
        : item.contractors ?? null,
    })) as UserProfile[]

    setUsers(normalizedUsers)
    setLoading(false)
  }

  async function loadSupportingData() {
    const [branchesResult, contractorsResult] =
      await Promise.all([
        supabase
          .from('branches')
          .select('id, branch_code, branch_name')
          .eq('is_active', true)
          .order('branch_code'),

        supabase
          .from('contractors')
          .select(
            'id, contractor_code, company_name'
          )
          .eq('is_active', true)
          .order('contractor_code'),
      ])

    if (branchesResult.error) {
      setError(branchesResult.error.message)
    } else {
      setBranches(
        (branchesResult.data ?? []) as Branch[]
      )
    }

    if (contractorsResult.error) {
      setError(contractorsResult.error.message)
    } else {
      setContractors(
        (contractorsResult.data ?? []) as Contractor[]
      )
    }
  }

  useEffect(() => {
    loadUsers()
    loadSupportingData()
  }, [])

  async function toggleUserStatus(user: UserProfile) {
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: !user.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      `${user.full_name} has been ${
        user.is_active
          ? 'deactivated'
          : 'activated'
      }.`
    )

    await loadUsers()
  }

  async function createUser() {
    setMessage('')
    setError('')

    if (!form.full_name.trim()) {
      setError('Full name is required.')
      return
    }

    if (!form.email.trim()) {
      setError('Email is required.')
      return
    }

    if (!form.password) {
      setError('Password is required.')
      return
    }

    if (form.password.length < 8) {
      setError(
        'Password must contain at least 8 characters.'
      )
      return
    }

    if (!form.role) {
      setError('Please select a role.')
      return
    }

    if (
      form.role === 'BRANCH_USER' &&
      !form.branch_id
    ) {
      setError(
        'A branch must be assigned to a Branch User.'
      )
      return
    }

    if (
      form.role === 'CONTRACTOR' &&
      !form.contractor_id
    ) {
      setError(
        'A contractor must be assigned to a Contractor user.'
      )
      return
    }

    setSaving(true)

    try {
      const response = await fetch(
        '/api/admin/users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            phone: form.phone.trim() || null,
            branch_id:
              form.branch_id || null,
            contractor_id:
              form.contractor_id || null,
            is_active: form.is_active,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        setError(
          result.error ||
            'Unable to create the user.'
        )
        setSaving(false)
        return
      }

      setMessage(
        `User ${form.full_name} was created successfully.`
      )

      setForm({
        full_name: '',
        email: '',
        password: '',
        role: 'BRANCH_USER',
        phone: '',
        branch_id: '',
        contractor_id: '',
        is_active: true,
      })

      setShowCreateForm(false)

      await loadUsers()
    } catch {
      setError(
        'Unable to connect to the user creation service.'
      )
    }

    setSaving(false)
  }

  const filteredUsers = users.filter((user) => {
    const searchText = search.trim().toLowerCase()

    const matchesSearch =
      !searchText ||
      user.full_name
        .toLowerCase()
        .includes(searchText) ||
      (user.email ?? '')
        .toLowerCase()
        .includes(searchText) ||
      roleLabel(user.role)
        .toLowerCase()
        .includes(searchText)

    const matchesRole =
      !roleFilter || user.role === roleFilter

    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'ACTIVE' &&
        user.is_active) ||
      (statusFilter === 'INACTIVE' &&
        !user.is_active)

    return (
      matchesSearch &&
      matchesRole &&
      matchesStatus
    )
  })

  const activeUsers = users.filter(
    (user) => user.is_active
  ).length

  const inactiveUsers = users.filter(
    (user) => !user.is_active
  ).length

  const hqAdmins = users.filter(
    (user) => user.role === 'HQ_ADMIN'
  ).length

  return (
    <div className="space-y-6">

      {/* Header */}
      <section className="overflow-hidden rounded-3xl dunkin-gradient p-8 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">

          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
              Administration
            </div>

            <h1 className="mt-2 text-3xl font-black lg:text-4xl">
              User Administration
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90">
              Manage system accounts, roles and access
              across the Dunkin Maintenance Control Tower.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCreateForm(true)
              setMessage('')
              setError('')
            }}
            className="rounded-xl bg-white px-5 py-3 text-sm font-black text-[#e85d91] shadow-sm transition hover:bg-[#fff8fa]"
          >
            + Create User
          </button>

        </div>
      </section>

      {/* Messages */}
      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* KPI */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="dunkin-card p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-500">
            Total Users
          </div>

          <div className="mt-2 text-3xl font-black text-[#4a2633]">
            {users.length}
          </div>
        </div>

        <div className="dunkin-card p-5 shadow-sm">
          <div className="text-sm font-semibold text-green-600">
            Active Users
          </div>

          <div className="mt-2 text-3xl font-black text-green-700">
            {activeUsers}
          </div>
        </div>

        <div className="dunkin-card p-5 shadow-sm">
          <div className="text-sm font-semibold text-red-600">
            Inactive Users
          </div>

          <div className="mt-2 text-3xl font-black text-red-700">
            {inactiveUsers}
          </div>
        </div>

        <div className="dunkin-card p-5 shadow-sm">
          <div className="text-sm font-semibold text-purple-600">
            HQ Administrators
          </div>

          <div className="mt-2 text-3xl font-black text-purple-700">
            {hqAdmins}
          </div>
        </div>

      </section>

      {/* Create User */}
      {showCreateForm && (
        <section className="dunkin-card overflow-hidden">

          <div className="flex items-center justify-between border-b border-[#f3dce5] px-6 py-5">
            <div>
              <h2 className="text-xl font-black text-[#4a2633]">
                Create New User
              </h2>

              <p className="text-sm text-slate-500">
                Create a login account and assign system access.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCreateForm(false)
              }
              className="rounded-lg border border-[#f3dce5] px-4 py-2 text-sm font-bold text-[#4a2633] hover:bg-[#fff8fa]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-bold text-[#4a2633]">
                Full Name *
              </label>

              <input
                type="text"
                value={form.full_name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    full_name: event.target.value,
                  })
                }
                placeholder="e.g. Ahmad Rahman"
                className="w-full rounded-xl border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-[#4a2633]">
                Email *
              </label>

              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email: event.target.value,
                  })
                }
                placeholder="user@company.com"
                className="w-full rounded-xl border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-[#4a2633]">
                Initial Password *
              </label>

              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({
                    ...form,
                    password: event.target.value,
                  })
                }
                placeholder="Minimum 8 characters"
                className="w-full rounded-xl border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-[#4a2633]">
                Phone
              </label>

              <input
                type="text"
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone: event.target.value,
                  })
                }
                placeholder="e.g. 012-3456789"
                className="w-full rounded-xl border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-[#4a2633]">
                Role *
              </label>

              <select
                value={form.role}
                onChange={(event) =>
                  setForm({
                    ...form,
                    role: event.target.value as Role,
                    branch_id: '',
                    contractor_id: '',
                  })
                }
                className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
              >
                {roles.map((role) => (
                  <option
                    key={role}
                    value={role}
                  >
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </div>

            {form.role === 'BRANCH_USER' && (
              <div>
                <label className="mb-1 block text-sm font-bold text-[#4a2633]">
                  Branch *
                </label>

                <select
                  value={form.branch_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      branch_id:
                        event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
                >
                  <option value="">
                    Select Branch
                  </option>

                  {branches.map((branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                    >
                      {branch.branch_code} —{' '}
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.role === 'CONTRACTOR' && (
              <div>
                <label className="mb-1 block text-sm font-bold text-[#4a2633]">
                  Contractor *
                </label>

                <select
                  value={form.contractor_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      contractor_id:
                        event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
                >
                  <option value="">
                    Select Contractor
                  </option>

                  {contractors.map(
                    (contractor) => (
                      <option
                        key={contractor.id}
                        value={contractor.id}
                      >
                        {contractor.contractor_code}{' '}
                        —{' '}
                        {contractor.company_name}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3 md:col-span-2">
              <input
                id="user-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm({
                    ...form,
                    is_active:
                      event.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300"
              />

              <label
                htmlFor="user-active"
                className="text-sm font-bold text-[#4a2633]"
              >
                Activate user immediately
              </label>
            </div>

          </div>

          <div className="flex justify-end gap-3 border-t border-[#f3dce5] bg-[#fff8fa] px-6 py-4">

            <button
              type="button"
              onClick={() =>
                setShowCreateForm(false)
              }
              className="rounded-xl border border-[#f3dce5] bg-white px-5 py-3 text-sm font-bold text-[#4a2633] hover:bg-[#fff1f6]"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={createUser}
              className="rounded-xl bg-[#f582ae] px-6 py-3 text-sm font-black text-white transition hover:bg-[#e85d91] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Creating User...'
                : 'Create User'}
            </button>

          </div>

        </section>
      )}

      {/* Filters */}
      <section className="dunkin-card p-6">

        <div className="mb-4">
          <h2 className="text-lg font-black text-[#4a2633]">
            User Directory
          </h2>

          <p className="text-sm text-slate-500">
            Search and filter registered system users.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          <div>
            <label className="mb-1 block text-sm font-bold text-[#4a2633]">
              Search
            </label>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Name, email or role"
              className="w-full rounded-xl border border-[#f3dce5] px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-[#4a2633]">
              Role
            </label>

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="">All Roles</option>

              {roles.map((role) => (
                <option
                  key={role}
                  value={role}
                >
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-[#4a2633]">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="w-full rounded-xl border border-[#f3dce5] bg-white px-4 py-3 text-sm outline-none focus:border-[#f582ae]"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">
                Active
              </option>
              <option value="INACTIVE">
                Inactive
              </option>
            </select>
          </div>

        </div>

        <div className="mt-4 flex items-center justify-between">

          <button
            type="button"
            onClick={() => {
              setSearch('')
              setRoleFilter('')
              setStatusFilter('')
            }}
            className="rounded-xl border border-[#f3dce5] bg-white px-5 py-3 text-sm font-bold text-[#4a2633] transition hover:bg-[#fff8fa]"
          >
            Reset Filters
          </button>

          <div className="text-sm text-slate-500">
            Showing{' '}
            <span className="font-bold text-[#4a2633]">
              {filteredUsers.length}
            </span>{' '}
            of {users.length} users
          </div>

        </div>

      </section>

      {/* User Table */}
      <section className="dunkin-card overflow-hidden">

        <div className="border-b border-[#f3dce5] px-6 py-5">
          <h2 className="text-lg font-black text-[#4a2633]">
            Registered Users
          </h2>
        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full text-sm">

            <thead className="bg-[#fff8fa] text-left">
              <tr>
                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  User
                </th>

                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Role
                </th>

                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Branch
                </th>

                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Contractor
                </th>

                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Phone
                </th>

                <th className="px-6 py-3 font-bold text-[#4a2633]">
                  Status
                </th>

                <th className="px-6 py-3 text-right font-bold text-[#4a2633]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f3dce5]">

              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Loading users...
                  </td>
                </tr>
              )}

              {!loading &&
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-[#fff8fa]"
                  >

                    <td className="px-6 py-4">
                      <div className="font-bold text-[#4a2633]">
                        {user.full_name}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {user.email || '-'}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${roleClass(
                          user.role
                        )}`}
                      >
                        {roleLabel(user.role)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {user.branches ? (
                        <div>
                          <div className="font-bold text-[#4a2633]">
                            {user.branches.branch_code}
                          </div>

                          <div className="text-xs text-slate-400">
                            {user.branches.branch_name}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {user.contractors ? (
                        <div>
                          <div className="font-bold text-[#4a2633]">
                            {user.contractors.contractor_code}
                          </div>

                          <div className="text-xs text-slate-400">
                            {user.contractors.company_name}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {user.phone || '-'}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          user.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {user.is_active
                          ? 'ACTIVE'
                          : 'INACTIVE'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          toggleUserStatus(user)
                        }
                        className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                          user.is_active
                            ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                            : 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {user.is_active
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                    </td>

                  </tr>
                ))}

              {!loading &&
                filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      No users match the selected filters.
                    </td>
                  </tr>
                )}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  )
}
