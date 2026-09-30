import api from './api'
import type {
  Integration,
  IntegrationDetailResponse,
  IntegrationListResponse,
  CreateIntegrationData,
  UpdateIntegrationData,
  ExternalFieldListResponse,
  FieldMappingInput,
  FieldMappingListResponse,
  SyncLog,
  SyncLogListResponse,
  OAuthAuthorizeResponse,
  ZohoBooksOrganization,
  ZohoBooksBranch,
  ZohoBooksAccount,
  ZohoBooksModule,
  ZohoBooksPreviewRow,
  CreateZohoBooksSourcesData,
} from '../types/integration'

export const integrationsApi = {
  getAll: () =>
    api.get<IntegrationListResponse>('/api/integrations').then(r => r.data),

  getById: (id: string) =>
    api.get<IntegrationDetailResponse>(`/api/integrations/${id}`).then(r => r.data),

  create: (data: CreateIntegrationData) =>
    api.post<Integration>('/api/integrations', data).then(r => r.data),

  update: (id: string, data: UpdateIntegrationData) =>
    api.put<Integration>(`/api/integrations/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/integrations/${id}`),

  triggerSync: (id: string) =>
    api.post<SyncLog>(`/api/integrations/${id}/sync`).then(r => r.data),

  getLogs: (id: string, limit = 20) =>
    api.get<SyncLogListResponse>(`/api/integrations/${id}/logs?limit=${limit}`).then(r => r.data),

  getExternalFields: (id: string) =>
    api.get<ExternalFieldListResponse>(`/api/integrations/${id}/external-fields`).then(r => r.data),

  setMappings: (id: string, mappings: FieldMappingInput[]) =>
    api.post<FieldMappingListResponse>(`/api/integrations/${id}/mappings`, { mappings }).then(r => r.data),

  /** Re-sync the last `days` days in the background */
  resync: (id: string, days: number) =>
    api.post<{ status: string; days: number }>(`/api/integrations/${id}/resync`, { days }).then(r => r.data),

  getOAuthUrl: (provider: string, integrationId: string) =>
    api.get<OAuthAuthorizeResponse>(`/api/integrations/oauth/${provider}/authorize?integration_id=${integrationId}`).then(r => r.data),

  // Zoho Books guided setup — all run against a connected integration's sign-in
  zohoBooks: {
    organizations: (authId: string) =>
      api.get<{ organizations: ZohoBooksOrganization[] }>(`/api/integrations/${authId}/zoho-books/organizations`)
        .then(r => r.data.organizations),

    branches: (authId: string, orgId: string) =>
      api.get<{ branches: ZohoBooksBranch[] }>(`/api/integrations/${authId}/zoho-books/branches`, { params: { org_id: orgId } })
        .then(r => r.data.branches),

    accounts: (authId: string, orgId: string, kind: 'income' | 'expense') =>
      api.get<{ accounts: ZohoBooksAccount[] }>(`/api/integrations/${authId}/zoho-books/accounts`, { params: { org_id: orgId, kind } })
        .then(r => r.data.accounts),

    fields: (authId: string, orgId: string, module: ZohoBooksModule) =>
      api.get<ExternalFieldListResponse>(`/api/integrations/${authId}/zoho-books/fields`, { params: { org_id: orgId, module } })
        .then(r => r.data.fields),

    preview: (authId: string, orgId: string, module: ZohoBooksModule, branchId?: string, days = 5) =>
      api.get<{ rows: ZohoBooksPreviewRow[] }>(`/api/integrations/${authId}/zoho-books/preview`, {
        params: { org_id: orgId, module, days, ...(branchId ? { branch_id: branchId } : {}) },
      }).then(r => r.data.rows),

    createSources: (authId: string, data: CreateZohoBooksSourcesData) =>
      api.post<IntegrationListResponse>(`/api/integrations/${authId}/zoho-books/sources`, data)
        .then(r => r.data.integrations),
  },
}
