import api from './api'
import type {
  AppListResponse,
  AppInstallation,
  AppRunRecord,
  AppRunRecordListResponse,
} from '../types/app'

export const appsApi = {
  getAll: () =>
    api.get<AppListResponse>('/api/apps').then(r => r.data),

  install: (appKey: string) =>
    api.post<AppInstallation>(`/api/apps/${appKey}/install`).then(r => r.data),

  configure: (appKey: string, config: Record<string, unknown>) =>
    api.put<AppInstallation>(`/api/apps/${appKey}/config`, { config }).then(r => r.data),

  configureSecrets: (appKey: string, secretConfig: Record<string, unknown>) =>
    api.put<AppInstallation>(`/api/apps/${appKey}/secret-config`, { secret_config: secretConfig }).then(r => r.data),

  enable: (appKey: string) =>
    api.post<AppInstallation>(`/api/apps/${appKey}/enable`).then(r => r.data),

  disable: (appKey: string) =>
    api.post<AppInstallation>(`/api/apps/${appKey}/disable`).then(r => r.data),

  uninstall: (appKey: string) =>
    api.delete(`/api/apps/${appKey}`),

  run: (appKey: string) =>
    api.post<AppRunRecord>(`/api/apps/${appKey}/run`, {}).then(r => r.data),

  getRuns: (appKey: string, limit = 20) =>
    api.get<AppRunRecordListResponse>(`/api/apps/${appKey}/runs?limit=${limit}`).then(r => r.data),
}
