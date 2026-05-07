export interface ErpTable {
  name: string
  type: string
}

export interface ErpField {
  name: string
  data_type: string
  is_nullable: boolean
}


export interface DomainRule {
  field: string
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'not_in' | 'is_null' | 'is_not_null'
  value: string
}

export interface Domain {
  id: number
  name: string
  description?: string
  source_table: string
  rules: DomainRule[]
  rule_logic: 'AND' | 'OR'
  created_at: string
}

export interface CreateDomainPayload {
  name: string
  description?: string
  source_table: string
  rules: DomainRule[]
  rule_logic: 'AND' | 'OR'
}

export type CampaignChannel  = 'email' | 'sms' | 'both'
export type CampaignStatus   = 'draft' | 'sending' | 'completed' | 'failed' | 'running' | 'sent' | 'partial'

export interface Campaign {
  id: number
  name: string
  domain_id: number
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