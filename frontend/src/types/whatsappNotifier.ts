export interface DataSourceOption {
  id: string
  name: string
}

export interface DataSourceOptionsResponse {
  kpis: DataSourceOption[]
  data_fields: DataSourceOption[]
}

export interface Recipient {
  id: string
  name: string
  phone: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RecipientListResponse {
  recipients: Recipient[]
  total: number
}

export interface RecipientsCsvImportResponse {
  imported: number
  errors: string[]
}

export interface Suppression {
  id: string
  phone: string
  reason: string | null
  created_at: string
}

export interface SuppressionListResponse {
  suppressions: Suppression[]
}

export interface SendLog {
  id: string
  run_id: string | null
  recipient_name: string | null
  phone_masked: string
  data_value: string | null
  template_used: string | null
  whatsapp_message_id: string | null
  delivery_status: string
  error: string | null
  created_at: string
}

export interface SendLogListResponse {
  logs: SendLog[]
  total: number
}
