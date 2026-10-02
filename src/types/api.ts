export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  message: string
  detail?: string
  statusCode?: number
}

export interface ApiCampaignLog {
  [key: string]: unknown
  contact_value?: string | null
  id: number
  recipient_ref: string
  channel: string
  success: boolean
  error_message: string | null
  retry_count: number
  retry_pending: boolean
  last_retried_at: string | null
  delivery_status: string
  quantum_message_id: string | null
  sent_at: string
  delivered_at: string | null
}
