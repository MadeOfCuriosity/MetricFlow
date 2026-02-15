export type IntegrationProvider = 'google_sheets' | 'zoho_crm' | 'zoho_books' | 'zoho_sheet' | 'leadsquared'
export type IntegrationStatus = 'pending_auth' | 'connected' | 'error' | 'disconnected'
export type SyncSchedule = 'manual' | '1h' | '6h' | '12h' | '24h'
export type AggregationType = 'direct' | 'count' | 'sum' | 'avg' | 'min' | 'max'

export interface Integration {
  id: string
  org_id: string
  provider: IntegrationProvider
  display_name: string
  status: IntegrationStatus
  error_message: string | null
  config: Record<string, unknown>
  sync_schedule: SyncSchedule
  last_synced_at: string | null
  next_sync_at: string | null
  created_at: string
  updated_at: string
  mapping_count: number
}

export interface IntegrationDetail extends Integration {
  field_mappings: FieldMapping[]
  recent_logs: SyncLog[]
}

export interface FieldMapping {
  id: string
  integration_id: string
  data_field_id: string
  data_field_name: string
  external_field_name: string
  external_field_label: string | null
  aggregation: AggregationType
  is_active: boolean
}

export interface ExternalField {
  name: string
  label: string
  field_type: string
}

export interface SyncLog {
  id: string
  integration_id: string
  status: 'running' | 'success' | 'partial' | 'failed'
  trigger_type: 'manual' | 'scheduled'
  started_at: string
  completed_at: string | null
  rows_fetched: number
  rows_written: number
  rows_skipped: number
  errors_count: number
  error_details: string[] | null
  summary: string | null
}

// Request types
export interface CreateIntegrationData {
  provider: IntegrationProvider
  display_name: string
  sync_schedule?: SyncSchedule
  config?: Record<string, unknown>
  api_key?: string
  api_secret?: string
}

export interface UpdateIntegrationData {
  display_name?: string
  sync_schedule?: SyncSchedule
  config?: Record<string, unknown>
}

export interface FieldMappingInput {
  external_field_name: string
  external_field_label?: string
  data_field_id: string
  aggregation?: AggregationType
}

// Response types
export interface IntegrationListResponse {
  integrations: Integration[]
  total: number
}

export interface IntegrationDetailResponse extends IntegrationDetail {}

export interface ExternalFieldListResponse {
  fields: ExternalField[]
  total: number
}

export interface SyncLogListResponse {
  logs: SyncLog[]
  total: number
}

export interface FieldMappingListResponse {
  mappings: FieldMapping[]
  total: number
}

export interface OAuthAuthorizeResponse {
  authorize_url: string
  state: string
}

// Provider metadata for UI
export interface ProviderInfo {
  id: IntegrationProvider
  name: string
  description: string
  authType: 'oauth' | 'api_key'
  color: string
  configFields: ConfigField[]
}

export interface ConfigField {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'select'
  options?: { value: string; label: string }[]
  required: boolean
}
