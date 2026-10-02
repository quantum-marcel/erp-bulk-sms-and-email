// Generated from docs/backend-openapi.json. Run npm run api:generate.
export type AdminUserCreate = {
  username: string
  name?: string | null
  email?: string | null
  is_active?: boolean
  is_admin?: boolean
  company_ids?: (number)[]
}

export type CampaignCreate = {
  name: string
  domain_id?: number | null
  channel?: ChannelType
  subject?: string | null
  email_body?: string | null
  email_field?: string
  email_config_id?: number | null
  sms_body?: string | null
  phone_field?: string
  sms_provider?: string | null
  direct_emails?: (string)[] | null
  direct_phones?: (string)[] | null
  scheduled_at?: string | null
}

export type CampaignOut = {
  id: number
  name: string
  domain_id?: number | null
  company_id: number
  channel: ChannelType
  status: CampaignStatus
  subject: string | null
  email_body: string | null
  email_config_id?: number | null
  sms_body: string | null
  sms_provider?: string | null
  direct_emails?: (string)[] | null
  direct_phones?: (string)[] | null
  total_recipients: number
  sent_count: number
  failed_count: number
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type CampaignPreviewRequest = {
  limit?: number
  offset?: number
  q?: string | null
}

export type CampaignPreviewResponse = {
  campaign_id: number
  campaign_name: string
  channel: string
  domain_id?: number | null
  total: number
  limit?: number
  offset?: number
  sample: (Record<string, unknown>)[]
}

export type CampaignStatus = "draft" | "running" | "completed" | "completed_with_failures" | "failed"

export type CampaignUpdate = {
  name?: string | null
  domain_id?: number | null
  channel?: ChannelType | null
  subject?: string | null
  email_body?: string | null
  email_field?: string | null
  email_config_id?: number | null
  sms_body?: string | null
  phone_field?: string | null
  sms_provider?: string | null
  direct_emails?: (string)[] | null
  direct_phones?: (string)[] | null
  scheduled_at?: string | null
}

export type ChannelType = "email" | "sms" | "both"

export type CompanyApiKeyOut = {
  company_id: number
  api_key: string
  prefix?: string | null
}

export type CompanyCreate = {
  name: string
  odoo_source?: OdooSourceUpsert | null
  sms_configs?: (SmsConfigCreate)[] | null
  email_configs?: (EmailConfigCreate)[] | null
  default_sms_provider?: string | null
  generate_api_key?: boolean
}

export type CompanyCreateResult = {
  id: number
  name: string
  created_at: string
  has_api_key?: boolean
  api_key_prefix?: string | null
  api_key_created_at?: string | null
  default_sms_provider?: string | null
  default_email_config_id?: number | null
  api_key?: string | null
}

export type CompanyOut = {
  id: number
  name: string
  created_at: string
  has_api_key?: boolean
  api_key_prefix?: string | null
  api_key_created_at?: string | null
  default_sms_provider?: string | null
  default_email_config_id?: number | null
}

export type CompanyUpdate = {
  name?: string | null
  default_sms_provider?: string | null
  default_email_config_id?: number | null
}

export type ContactOut = {
  value: string
  channel: "email" | "phone"
}

export type DispatchResult = {
  campaign_id: number
  status: string
  total_recipients: number
  message: string
  job_id?: number | null
}

export type DomainCreate = {
  name: string
  description?: string | null
  kind?: "rules" | "list"
  source_table?: string | null
  rules?: (FilterRule | RuleGroup_Input)[] | null
  rule_logic?: "AND" | "OR"
  emails?: (string)[] | null
  phones?: (string)[] | null
}

export type DomainDetailOut = {
  id: number
  name: string
  description: string | null
  source_table: string | null
  company_id: number
  kind?: string
  rules: (FilterRule | RuleGroup_Output)[]
  rule_logic: string
  created_at: string
  email_count?: number
  phone_count?: number
  emails?: (string)[] | null
  phones?: (string)[] | null
}

export type DomainOut = {
  id: number
  name: string
  description: string | null
  source_table: string | null
  company_id: number
  kind?: string
  rules: (FilterRule | RuleGroup_Output)[]
  rule_logic: string
  created_at: string
  email_count?: number
  phone_count?: number
}

export type DomainUpdate = {
  name?: string | null
  description?: string | null
  source_table?: string | null
  rules?: (FilterRule | RuleGroup_Input)[] | null
  rule_logic?: "AND" | "OR" | null
  emails?: (string)[] | null
  phones?: (string)[] | null
}

export type EmailConfigCreate = {
  name: string
  host: string
  port?: number
  encryption?: string
  username?: string | null
  password?: string | null
  from_email: string
  from_name?: string | null
  timeout?: number | null
  enabled?: boolean | null
  is_default?: boolean | null
}

export type EmailConfigOption = {
  id: number
  name: string
  configured: boolean
  is_default: boolean
  from_email?: string | null
}

export type EmailConfigOut = {
  id: number
  company_id: number
  name: string
  enabled: boolean
  configured: boolean
  is_default: boolean
  host?: string | null
  port?: number | null
  encryption?: string | null
  username?: string | null
  password_preview?: string | null
  from_email?: string | null
  from_name?: string | null
  timeout?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type EmailConfigTestOut = {
  ok: boolean
  latency_ms?: number | null
  detail?: string | null
}

export type EmailConfigUpdate = {
  name?: string | null
  host?: string | null
  port?: number | null
  encryption?: string | null
  username?: string | null
  password?: string | null
  clear_password?: boolean
  from_email?: string | null
  from_name?: string | null
  timeout?: number | null
  enabled?: boolean | null
  is_default?: boolean | null
}

export type FilterRule = {
  field: string
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in" | "not_in" | "is_null" | "is_not_null"
  value?: unknown | null
}

export type HTTPValidationError = {
  detail?: (ValidationError)[]
}

export type LoginRequest = {
  username: string
  password: string
}

export type OdooSourceOut = {
  company_id: number
  configured: boolean
  enabled: boolean
  source_url?: string | null
  source_db?: string | null
  source_username?: string | null
  key_preview?: string | null
  timeout?: number | null
  updated_at?: string | null
}

export type OdooSourceProvisionIn = {
  source_url?: string | null
  source_db?: string | null
  source_username?: string | null
  password?: string | null
  api_key?: string | null
  key_description?: string
  timeout?: number | null
  enabled?: boolean | null
}

export type OdooSourceProvisionOut = {
  company_id: number
  configured: boolean
  provisioned?: boolean
  key_preview?: string | null
  odoo_version?: string | null
  detail?: string | null
}

export type OdooSourceTestOut = {
  ok: boolean
  odoo_version?: string | null
  latency_ms?: number | null
  detail?: string | null
}

export type OdooSourceUpsert = {
  source_url?: string | null
  source_db?: string | null
  source_username?: string | null
  api_key?: string | null
  clear_key?: boolean
  timeout?: number | null
  enabled?: boolean | null
}

export type Page_CampaignOut_ = {
  items: (CampaignOut)[]
  total: number
  limit: number
  offset: number
}

export type Page_CompanyOut_ = {
  items: (CompanyOut)[]
  total: number
  limit: number
  offset: number
}

export type Page_ContactOut_ = {
  items: (ContactOut)[]
  total: number
  limit: number
  offset: number
}

export type Page_DomainOut_ = {
  items: (DomainOut)[]
  total: number
  limit: number
  offset: number
}

export type Page_UserCompanyWithUserOut_ = {
  items: (UserCompanyWithUserOut)[]
  total: number
  limit: number
  offset: number
}

export type Page_UserOut_ = {
  items: (UserOut)[]
  total: number
  limit: number
  offset: number
}

export type Page_dict_ = {
  items: (Record<string, unknown>)[]
  total: number
  limit: number
  offset: number
}

export type PartnerFieldIn = {
  name: string
  label?: string | null
  ttype?: string | null
  relation?: string | null
  selection?: (unknown)[] | null
  searchable?: boolean
}

export type PartnerFieldOut = {
  name: string
  label?: string | null
  ttype?: string | null
  relation?: string | null
  selection?: (unknown)[] | null
  searchable?: boolean
  source?: string
  supported?: boolean
}

export type PartnerFieldsOut = {
  company_id: number
  model?: string
  count: number
  schema_cached: boolean
  fields: (PartnerFieldOut)[]
}

export type PartnerFieldsSyncIn = {
  model?: string
  fields: (PartnerFieldIn)[]
}

export type PartnerRecord = {
  id: number
  name?: string | null
  email?: string | null
  phone?: string | null
}

export type PreviewRequest = {
  domain_id: number
  limit?: number
  offset?: number
  q?: string | null
}

export type PreviewResponse = {
  domain_id: number
  domain_name: string
  total_matched: number
  limit?: number
  offset?: number
  sample: (Record<string, unknown>)[]
}

export type QuantumWebhookParams = {
  message_statuses: (Record<string, (string)[]>)[]
}

export type QuantumWebhookPayload = {
  id: string
  jsonrpc?: string | null
  params: QuantumWebhookParams
}

export type ResPartnerField = {
  name: string
  label: string
  type: string
  nullable: boolean
  primary_key: boolean
}

export type RuleGroup_Input = {
  match?: "AND" | "OR"
  negate?: boolean
  rules: (FilterRule | RuleGroup_Input)[]
}

export type RuleGroup_Output = {
  match?: "AND" | "OR"
  negate?: boolean
  rules: (FilterRule | RuleGroup_Output)[]
}

export type SelectCompanyRequest = {
  company_id: number
}

export type SmsConfigCreate = {
  endpoint?: string | null
  sender_id?: string | null
  auth_name?: string | null
  secret?: string | null
  clear_secret?: boolean
  timeout?: number | null
  extra?: Record<string, unknown> | null
  is_default?: boolean | null
  provider: string
}

export type SmsConfigOut = {
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

export type SmsConfigUpsert = {
  endpoint?: string | null
  sender_id?: string | null
  auth_name?: string | null
  secret?: string | null
  clear_secret?: boolean
  timeout?: number | null
  extra?: Record<string, unknown> | null
  is_default?: boolean | null
}

export type SmsProviderOut = {
  id: string
  label: string
  configured: boolean
  is_default: boolean
}

export type UserCompanyWithUserOut = {
  id: number
  user_id: number
  username: string
  company_id: number
}

export type UserOut = {
  id: number
  username: string
  name: string | null
  email: string | null
  is_active: boolean
  is_admin: boolean
  last_login: string | null
  created_at: string
}

export type UserUpdate = {
  name?: string | null
  email?: string | null
  is_active?: boolean | null
  is_admin?: boolean | null
  company_ids?: (number)[] | null
}

export type ValidationError = {
  loc: (string | number)[]
  msg: string
  type: string
}
