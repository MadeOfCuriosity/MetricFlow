import superadminApi, { SUPERADMIN_TOKEN_KEY } from './superadminApi'

export interface SuperAdmin {
  id: string
  email: string
  name: string | null
  picture: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  created_by_email: string | null
}

export interface SuperAdminAuthResponse {
  access_token: string
  token_type: string
  admin: SuperAdmin
}

export interface PlatformInsights {
  total_orgs: number
  total_users: number
  active_subscriptions: number
  mrr: number
  orgs_created_30d: number
  users_created_30d: number
  signups_by_day: { date: string; orgs: number; users: number }[]
  orgs_by_industry: { industry: string; count: number }[]
  orgs_by_plan: { plan_code: string; count: number }[]
  orgs_by_plan_status: { plan_status: string; count: number }[]
  feature_adoption: {
    with_integrations: number
    with_kpis: number
    with_rooms: number
    with_data: number
  }
}

export interface OrgListItem {
  id: string
  name: string
  industry: string | null
  website: string | null
  plan_code: string | null
  plan_status: string | null
  plan_current_end: string | null
  created_at: string
  user_count: number
  room_count: number
  integration_count: number
}

export interface OrgListResponse {
  items: OrgListItem[]
  total: number
}

export interface OrgDetailUser {
  id: string
  email: string
  name: string
  role: string
  role_label: string | null
  auth_provider: string | null
  created_at: string
}

export interface OrgDetailSubscription {
  id: string
  plan_code: string
  status: string
  razorpay_subscription_id: string | null
  current_start: string | null
  current_end: string | null
  paid_count: number
  total_count: number | null
  created_at: string
}

export interface OrgDetailIntegration {
  id: string
  provider: string
  status: string | null
  created_at: string
}

export interface OrgDetail {
  id: string
  name: string
  industry: string | null
  website: string | null
  plan_code: string | null
  plan_status: string | null
  plan_current_end: string | null
  created_at: string
  users: OrgDetailUser[]
  subscriptions: OrgDetailSubscription[]
  integrations: OrgDetailIntegration[]
  kpi_count: number
  room_count: number
  entry_count: number
}

export interface GlobalUserItem {
  id: string
  email: string
  name: string
  role: string
  role_label: string | null
  auth_provider: string | null
  created_at: string
  org_id: string
  org_name: string
}

export interface GlobalSubscriptionItem {
  id: string
  org_id: string
  org_name: string
  plan_code: string
  status: string
  razorpay_subscription_id: string | null
  current_start: string | null
  current_end: string | null
  paid_count: number
  total_count: number | null
  created_at: string
}

// --- Phase 2 types ---

export interface ImpersonationResult {
  access_token: string
  refresh_token: string
  token_type: string
  user: {
    id: string
    email: string
    name: string
    role: string
    role_label: string
    auth_provider: string | null
    created_at: string
  }
  organization: {
    id: string
    name: string
    industry: string | null
    created_at: string
    plan_code: string | null
    plan_status: string | null
    plan_current_end: string | null
  }
  impersonation: {
    superadmin_email: string
    expires_at: string
  }
}

export interface CampaignTargetFilter {
  all?: boolean
  industries?: string[] | null
  plan_codes?: string[] | null
  plan_statuses?: string[] | null
}

export interface CreateCampaignData {
  title: string
  body: string
  cta_label?: string | null
  cta_url?: string | null
  channel: 'in_app' | 'email'
  severity: 'info' | 'warning' | 'success' | 'announcement'
  target: CampaignTargetFilter
  expires_at?: string | null
}

export interface Campaign {
  id: string
  created_by_email: string
  title: string
  body: string
  cta_label: string | null
  cta_url: string | null
  channel: string
  severity: string
  status: string
  target_filter: CampaignTargetFilter | null
  recipient_org_count: number | null
  recipient_user_count: number | null
  sent_at: string | null
  expires_at: string | null
  created_at: string
}

export interface AuditLogItem {
  id: string
  superadmin_id: string | null
  superadmin_email: string
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, any> | null
  ip_address: string | null
  created_at: string
}

export interface IndustryMetrics {
  industry: string
  org_count: number
  user_count: number
  active_subscriptions: number
  orgs_with_integrations: number
  orgs_with_kpis: number
  orgs_with_data: number
  mrr: number
}

export interface SystemHealth {
  integration_failures: {
    org_id: string
    org_name: string
    provider: string
    status: string
    error_message: string | null
    last_sync_at: string | null
  }[]
  webhooks: {
    total_events_7d: number
    failed_events_7d: number
    last_event_at: string | null
  }
  syncs: {
    total_syncs_7d: number
    failed_syncs_7d: number
    last_sync_at: string | null
  }
  ai_usage: {
    calls_30d: number
    orgs_using_ai_30d: number
  }
}

export const superadminService = {
  async googleLogin(credential: string): Promise<SuperAdminAuthResponse> {
    const res = await superadminApi.post<SuperAdminAuthResponse>(
      '/api/superadmin/auth/google',
      { credential }
    )
    return res.data
  },

  async me(): Promise<SuperAdmin> {
    const res = await superadminApi.get<SuperAdmin>('/api/superadmin/auth/me')
    return res.data
  },

  async getInsights(): Promise<PlatformInsights> {
    const res = await superadminApi.get<PlatformInsights>('/api/superadmin/insights')
    return res.data
  },

  async listOrgs(params: {
    q?: string
    industry?: string
    plan_status?: string
    plan_code?: string
    limit?: number
    offset?: number
  }): Promise<OrgListResponse> {
    const res = await superadminApi.get<OrgListResponse>('/api/superadmin/organizations', { params })
    return res.data
  },

  async getOrg(orgId: string): Promise<OrgDetail> {
    const res = await superadminApi.get<OrgDetail>(`/api/superadmin/organizations/${orgId}`)
    return res.data
  },

  async listUsers(params: {
    q?: string
    role?: string
    org_id?: string
    limit?: number
    offset?: number
  }): Promise<{ items: GlobalUserItem[]; total: number }> {
    const res = await superadminApi.get('/api/superadmin/users', { params })
    return res.data
  },

  async listSubscriptions(params: {
    status?: string
    plan_code?: string
    limit?: number
    offset?: number
  }): Promise<{ items: GlobalSubscriptionItem[]; total: number }> {
    const res = await superadminApi.get('/api/superadmin/subscriptions', { params })
    return res.data
  },

  async listAdmins(): Promise<SuperAdmin[]> {
    const res = await superadminApi.get<SuperAdmin[]>('/api/superadmin/admins')
    return res.data
  },

  async createAdmin(data: { email: string; name?: string }): Promise<SuperAdmin> {
    const res = await superadminApi.post<SuperAdmin>('/api/superadmin/admins', data)
    return res.data
  },

  async updateAdmin(
    adminId: string,
    data: { is_active?: boolean; name?: string }
  ): Promise<SuperAdmin> {
    const res = await superadminApi.patch<SuperAdmin>(`/api/superadmin/admins/${adminId}`, data)
    return res.data
  },

  async deleteAdmin(adminId: string): Promise<void> {
    await superadminApi.delete(`/api/superadmin/admins/${adminId}`)
  },

  // --- Impersonation ---
  async impersonate(userId: string, reason?: string): Promise<ImpersonationResult> {
    const res = await superadminApi.post<ImpersonationResult>(
      `/api/superadmin/impersonate/${userId}`,
      { reason: reason || null }
    )
    return res.data
  },

  // --- Campaigns ---
  async previewCampaignTarget(filter: CampaignTargetFilter): Promise<{ org_count: number; user_count: number }> {
    const res = await superadminApi.post('/api/superadmin/campaigns/preview-target', { filter })
    return res.data
  },

  async createCampaign(data: CreateCampaignData): Promise<Campaign> {
    const res = await superadminApi.post<Campaign>('/api/superadmin/campaigns', data)
    return res.data
  },

  async sendCampaign(id: string): Promise<Campaign> {
    const res = await superadminApi.post<Campaign>(`/api/superadmin/campaigns/${id}/send`)
    return res.data
  },

  async listCampaigns(params: { status?: string; limit?: number; offset?: number } = {}): Promise<{ items: Campaign[]; total: number }> {
    const res = await superadminApi.get('/api/superadmin/campaigns', { params })
    return res.data
  },

  async deleteCampaign(id: string): Promise<void> {
    await superadminApi.delete(`/api/superadmin/campaigns/${id}`)
  },

  // --- Audit log ---
  async listAuditLog(params: { q?: string; action?: string; limit?: number; offset?: number } = {}): Promise<{ items: AuditLogItem[]; total: number }> {
    const res = await superadminApi.get('/api/superadmin/audit-log', { params })
    return res.data
  },

  // --- Industries ---
  async getIndustries(): Promise<{ items: IndustryMetrics[] }> {
    const res = await superadminApi.get('/api/superadmin/industries')
    return res.data
  },

  // --- System health ---
  async getHealth(): Promise<SystemHealth> {
    const res = await superadminApi.get('/api/superadmin/health')
    return res.data
  },

  getToken(): string | null {
    return localStorage.getItem(SUPERADMIN_TOKEN_KEY)
  },

  setToken(token: string): void {
    localStorage.setItem(SUPERADMIN_TOKEN_KEY, token)
  },

  getStoredAdmin(): SuperAdmin | null {
    const raw = localStorage.getItem('superadmin_user')
    return raw ? JSON.parse(raw) : null
  },

  setStoredAdmin(admin: SuperAdmin): void {
    localStorage.setItem('superadmin_user', JSON.stringify(admin))
  },

  logout(): void {
    localStorage.removeItem(SUPERADMIN_TOKEN_KEY)
    localStorage.removeItem('superadmin_user')
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },
}
