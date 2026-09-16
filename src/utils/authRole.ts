import type { AuthRole, AuthRoleObject } from '@/types/auth'

export function resolveAuthRole(role?: string | AuthRoleObject | null, isAdmin?: boolean): AuthRole {
  if (typeof isAdmin === 'boolean') return isAdmin ? 'admin' : 'user'
  const value = typeof role === 'string' ? role : role?.code || role?.name || role?.role
  // Support the backend's older elevated role without exposing a third UI role.
  return value === 'admin' || value === 'super_admin' ? 'admin' : 'user'
}
