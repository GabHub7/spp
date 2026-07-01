import { redirect } from 'next/navigation'
import { createClient, createServiceClient, type SupabaseServiceClient } from '@/lib/supabase/server'
import type { RoleName } from '@/types'

export interface SessionUser {
  /** Internal users.id — use for foreign keys (payments.officer_id, audit_logs.user_id). */
  id: string
  authId: string
  username: string
  fullName: string
  email: string | null
  role: RoleName
  status: string
}

export interface AuthContext {
  user: SessionUser
  serviceClient: SupabaseServiceClient
}

/**
 * Resolves the current session into an internal PoncolPay user profile.
 * Returns null when not authenticated or the profile is missing/inactive.
 *
 * Note: `users.id` (internal PK) ≠ `auth_id` (Supabase Auth UID). Always
 * look up by `auth_id`. Role lives on `roles(name)`, which Supabase may
 * return as an array — normalize both shapes.
 */
export async function getSession(): Promise<AuthContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('users')
    .select('id, auth_id, username, full_name, email, status, roles(name)')
    .eq('auth_id', user.id)
    .single()

  if (!profile || profile.status !== 'ACTIVE') return null

  const rel = profile.roles
  const roleRecord = Array.isArray(rel) ? rel[0] : rel
  const role = (roleRecord as { name?: RoleName } | null)?.name
  if (!role) return null

  return {
    serviceClient,
    user: {
      id: profile.id as string,
      authId: profile.auth_id as string,
      username: profile.username as string,
      fullName: profile.full_name as string,
      email: (profile.email as string | null) ?? null,
      role,
      status: profile.status as string,
    },
  }
}

/** Page guard — redirects to /login when unauthenticated. */
export async function requireSession(): Promise<AuthContext> {
  const ctx = await getSession()
  if (!ctx) redirect('/login')
  return ctx
}

/** Page guard restricted to certain roles — redirects home if not allowed. */
export async function requireRole(roles: RoleName[]): Promise<AuthContext> {
  const ctx = await requireSession()
  if (!roles.includes(ctx.user.role)) {
    redirect(ctx.user.role === 'ORANG_TUA' ? '/portal' : '/')
  }
  return ctx
}

/** Page guard for the parent portal — staff are redirected to the backoffice. */
export async function requireParent(): Promise<AuthContext> {
  const ctx = await requireSession()
  if (ctx.user.role !== 'ORANG_TUA') redirect('/')
  return ctx
}

/** Default landing path for a role after login. */
export function homePathForRole(role: RoleName): string {
  return role === 'ORANG_TUA' ? '/portal' : '/'
}

const PERMS = {
  manageMasterData: ['ADMIN'],
  managePayments: ['ADMIN', 'BENDAHARA'],
  deleteData: ['ADMIN'],
  manageUsers: ['ADMIN'],
  backup: ['ADMIN'],
  viewReports: ['ADMIN', 'BENDAHARA', 'KEPALA_SEKOLAH'],
} as const

export type Permission = keyof typeof PERMS

export function can(role: RoleName, perm: Permission): boolean {
  return (PERMS[perm] as readonly RoleName[]).includes(role)
}
