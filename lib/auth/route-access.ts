import type { Role } from './roles'

export type RouteRule = {
  prefix: string
  roles: Role[]
}

/**
 * Route-level authorization. Navigation is only presentation; these rules
 * protect direct URL access as well.
 */
export const ROUTE_RULES: RouteRule[] = [
  { prefix: '/contractor', roles: ['CONTRACTOR'] },
  { prefix: '/branch/requests', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE'] },
  { prefix: '/branch/jobs/new', roles: ['BRANCH_USER'] },
  { prefix: '/branch/jobs/', roles: ['BRANCH_USER'] },
  { prefix: '/branch/jobs', roles: ['BRANCH_USER'] },
  { prefix: '/branch', roles: ['BRANCH_USER'] },

  { prefix: '/jobs/new', roles: ['HQ_ADMIN', 'HQ_MAINTENANCE'] },
  { prefix: '/jobs/', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE', 'FINANCE'] },
  { prefix: '/jobs', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE'] },

  { prefix: '/assets/new', roles: ['HQ_ADMIN', 'HQ_MAINTENANCE'] },
  { prefix: '/assets/', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE'] },
  { prefix: '/assets', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE'] },

  { prefix: '/contractors/new', roles: ['HQ_ADMIN'] },
  { prefix: '/contractors/', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE', 'FINANCE'] },
  { prefix: '/contractors', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE', 'FINANCE'] },

  { prefix: '/contractor-performance', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE'] },

  { prefix: '/finance/quotations', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE', 'FINANCE', 'CONTRACTOR'] },
  { prefix: '/finance/purchase-orders', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE', 'FINANCE'] },
  { prefix: '/finance/invoices', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE', 'FINANCE'] },
  { prefix: '/finance/payments', roles: ['MANAGEMENT', 'HQ_ADMIN', 'FINANCE'] },
  { prefix: '/finance/reports', roles: ['MANAGEMENT', 'HQ_ADMIN', 'FINANCE'] },

  { prefix: '/branches', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE'] },
  { prefix: '/preventive-maintenance', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE'] },

  { prefix: '/reports/maintenance', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE'] },
  { prefix: '/reports/cost', roles: ['MANAGEMENT', 'HQ_ADMIN', 'FINANCE'] },
  { prefix: '/reports/sla', roles: ['MANAGEMENT', 'HQ_ADMIN', 'HQ_MAINTENANCE'] },

  { prefix: '/admin/users', roles: ['HQ_ADMIN'] },
  { prefix: '/admin/audit', roles: ['HQ_ADMIN', 'MANAGEMENT'] },
  { prefix: '/settings', roles: ['HQ_ADMIN'] },
]

export function getRouteRule(pathname: string): RouteRule | null {
  // Most-specific route wins. This matters for /jobs/new vs /jobs/.
  return ROUTE_RULES
    .filter((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0] ?? null
}
