export interface CompanySummary {
  id: number
  name: string
}

export interface Company extends CompanySummary {
  has_api_key?: boolean
  api_key_prefix?: string | null
  api_key_created_at?: string | null
  default_sms_provider?: string | null
  created_at: string
}

export interface CreateCompanyPayload {
  name: string
}

export interface UpdateCompanyPayload {
  default_sms_provider?: string | null
  name?: string | null
}

export interface SmsConfig {
  provider: string
  label: string
  configured: boolean
  is_default: boolean
  endpoint?: string | null
  sender_id?: string | null
  auth_name?: string | null
  secret_preview?: string | null
  timeout?: number | null
  extra?: Record<string, unknown> | null
  updated_at?: string | null
}

export interface SmsConfigUpsert {
  endpoint?: string | null
  sender_id?: string | null
  auth_name?: string | null
  secret?: string | null
  clear_secret?: boolean
  timeout?: number | null
  extra?: Record<string, unknown> | null
  is_default?: boolean | null
}
