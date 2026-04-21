/**
 * Impersonation session helpers.
 *
 * When a super-admin impersonates an org user, we swap the standard org-user
 * auth keys (``token``, ``refreshToken``, ``user``, ``organization``) with the
 * impersonation token, leaving the ``superadmin_token`` untouched so we can
 * restore the super-admin session on exit.
 */

import { ImpersonationResult } from './superadmin'

export const IMPERSONATION_FLAG = 'impersonation_active'
export const IMPERSONATION_META = 'impersonation_meta'

export interface ImpersonationMeta {
  superadmin_email: string
  expires_at: string
  user_email: string
  org_name: string
}

export function startImpersonation(result: ImpersonationResult) {
  localStorage.setItem('token', result.access_token)
  localStorage.setItem('refreshToken', result.refresh_token)
  localStorage.setItem('user', JSON.stringify(result.user))
  localStorage.setItem('organization', JSON.stringify(result.organization))
  localStorage.setItem(IMPERSONATION_FLAG, 'true')
  const meta: ImpersonationMeta = {
    superadmin_email: result.impersonation.superadmin_email,
    expires_at: result.impersonation.expires_at,
    user_email: result.user.email,
    org_name: result.organization.name,
  }
  localStorage.setItem(IMPERSONATION_META, JSON.stringify(meta))
}

export function endImpersonation() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('organization')
  localStorage.removeItem(IMPERSONATION_FLAG)
  localStorage.removeItem(IMPERSONATION_META)
}

export function isImpersonating(): boolean {
  return localStorage.getItem(IMPERSONATION_FLAG) === 'true'
}

export function getImpersonationMeta(): ImpersonationMeta | null {
  const raw = localStorage.getItem(IMPERSONATION_META)
  return raw ? JSON.parse(raw) : null
}
