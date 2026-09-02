export type AppTrigger = 'on_demand' | 'scheduled' | 'event'
export type EntitlementStatus = 'not_required' | 'required' | 'granted' | 'revoked'
export type AppRunStatus = 'running' | 'success' | 'partial' | 'failed'

export interface AppConfigField {
  key: string
  label: string
  field_type: 'string' | 'number' | 'boolean' | 'select'
  required: boolean
  secret: boolean
  options: string[] | null
  default: unknown
  help_text: string | null
}

export interface SecretFieldStatus {
  configured: boolean
  last4: string | null
}

export interface AppInstallation {
  id: string
  org_id: string
  app_key: string
  is_enabled: boolean
  entitlement_status: EntitlementStatus
  config: Record<string, unknown>
  secret_config_status: Record<string, SecretFieldStatus>
  installed_at: string
  updated_at: string
}

export interface AppSummary {
  key: string
  name: string
  description: string
  requires_entitlement: boolean
  triggers: AppTrigger[]
  default_schedule: string | null
  config_schema: AppConfigField[]
  installation: AppInstallation | null
}

export interface AppListResponse {
  apps: AppSummary[]
}

export interface AppRunRecord {
  id: string
  installation_id: string
  org_id: string
  app_key: string
  status: AppRunStatus
  trigger_type: 'on_demand' | 'scheduled' | 'event'
  triggered_by: string | null
  started_at: string
  completed_at: string | null
  result: Record<string, unknown> | null
  error: string | null
  summary: string | null
}

export interface AppRunRecordListResponse {
  runs: AppRunRecord[]
  total: number
}
