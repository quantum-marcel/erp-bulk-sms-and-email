import type * as Backend from './backend'

export interface PartnerField {
  name: string
  label: string | null
  ttype: string | null
  relation: string | null
  selection?: unknown[] | null
  searchable: boolean
  supported: boolean
  source: string
}

export type PartnerFieldsResponse = Backend.PartnerFieldsOut


export type DomainRule = Backend.FilterRule

export type Domain = Backend.DomainOut

export type CreateDomainPayload = Backend.DomainCreate

export type CampaignChannel = Backend.ChannelType
export type CampaignStatus = Backend.CampaignStatus

// Older deployments may include recipient field names; 3.4.0 omits them.
export type Campaign = Backend.CampaignOut & {
  email_field?: string
  phone_field?: string
}

export type CreateCampaignPayload = Backend.CampaignCreate

export type PreviewRequest = Backend.PreviewRequest

export type PreviewResponse = Backend.PreviewResponse

export type DispatchResult = Backend.DispatchResult

export interface CampaignLog {
  raw?: Record<string, unknown>
  contact_value?: string | null
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

export type SmsProvider = Backend.SmsProviderOut
