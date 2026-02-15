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

  getOAuthUrl: (provider: string, integrationId: string) =>
    api.get<OAuthAuthorizeResponse>(`/api/integrations/oauth/${provider}/authorize?integration_id=${integrationId}`).then(r => r.data),
}
