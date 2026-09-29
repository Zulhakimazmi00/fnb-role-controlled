
import { redirect } from 'next/navigation'

export type Role =
  | 'MANAGEMENT'
  | 'HQ_ADMIN'
  | 'HQ_MAINTENANCE'
  | 'FINANCE'
  | 'CONTRACTOR'
  | 'BRANCH_USER'

export const ALL_ROLES: Role[] = [
  'MANAGEMENT',
  'HQ_ADMIN',
  'HQ_MAINTENANCE',
  'FINANCE',
  'CONTRACTOR',
  'BRANCH_USER',
]

export function isValidRole(role: string): role is Role {
  return ALL_ROLES.includes(role as Role)
}

export function requireRole(
  role: Role,
  allowedRoles: Role[]
) {
  if (!allowedRoles.includes(role)) {
    redirect('/unauthorized')
  }
}

export function requireHqAdmin(role: Role) {
  requireRole(role, ['HQ_ADMIN'])
}

export function requireMaintenanceAccess(role: Role) {
  requireRole(role, [
    'HQ_ADMIN',
    'HQ_MAINTENANCE',
  ])
}

export function requireFinanceAccess(role: Role) {
  requireRole(role, [
    'HQ_ADMIN',
    'FINANCE',
  ])
}

export function requireManagementAccess(role: Role) {
  requireRole(role, [
    'HQ_ADMIN',
    'MANAGEMENT',
  ])
}

