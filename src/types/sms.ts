export interface ErpTable {
  model: string
  name: string
  state: string
}

export interface ErpField {
  name: string
  type: string
  string: string
  required: boolean
  readonly: boolean
}


export interface DomainRule {
  field: string
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'not_in' | 'is_null' | 'is_not_null'
  value?: unknown | null
}

export interface Domain {
  id: number
  name: string
  description: string | null
  source_table: string | null
  company_id: number
  rules: DomainRule[]
  rule_logic: 'AND' | 'OR'
  created_at: string
}

export interface CreateDomainPayload {
  name: string
  description?: string | null
  source_table?: string | null
  rules: DomainRule[]
  rule_logic?: 'AND' | 'OR'
}

export type CampaignChannel  = 'email' | 'sms' | 'both'
export type CampaignStatus   = 'draft' | 'running' | 'completed' | 'completed_with_failures' | 'failed'

export interface Campaign {
  id: number
  name: string
  domain_id: number
  company_id: number
  channel: CampaignChannel
  status: CampaignStatus
  subject?: string
  email_body?: string
  email_field?: string
  sms_body?: string
  phone_field?: string
  total_recipients: number
  sent_count: number
  failed_count: number
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface CreateCampaignPayload {
  name: string
  domain_id: number
  channel: CampaignChannel
  subject?: string
  email_body?: string
  email_field?: string
  sms_body?: string
  phone_field?: string
  scheduled_at?: string
}

export interface DispatchResult {
  campaign_id: number
  status: string
  total_recipients: number
  message: string
}

export interface CampaignLog {
  id: number
  campaign_id: number
  recipient: string
  channel: 'email' | 'sms'
  status: 'sent' | 'failed'
  error?: string
  sent_at: string
  delivery_status?: string
  retry_count?: number
  retry_pending?: boolean
  quantum_message_id?: string
  delivered_at?: string | null
}


export interface DashboardStats {
  totalCampaigns: number
  totalSent: number
  totalFailed: number
  drafts: number
  domains: number
  deliveryRate: number
}
