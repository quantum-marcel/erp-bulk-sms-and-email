import type { CampaignLog } from '@/types/sms'

// Provider acceptance does not establish delivery. Only explicit receipts do.
export type LogDisplayStatus = 'delivered' | 'accepted' | 'pending' | 'failed'

export function getLogDisplayStatus(log: CampaignLog): LogDisplayStatus {
  const deliveryStatus = log.delivery_status?.toLowerCase()
  if (deliveryStatus === 'delivered' || log.delivered_at) return 'delivered'
  if (deliveryStatus === 'failed') return 'failed'
  if (log.retry_pending) return 'pending'
  if (log.status === 'failed') return 'failed'
  if (deliveryStatus === 'pending') return 'pending'
  return 'accepted'
}

export const LOG_STATUS_META: Record<LogDisplayStatus, { label: string; color: string; icon: string }> = {
  delivered: { label: 'Delivered', color: 'success', icon: 'mdi-check-all' },
  accepted:  { label: 'Accepted', color: 'info', icon: 'mdi-send-check-outline' },
  pending:   { label: 'Pending',   color: 'warning', icon: 'mdi-clock-outline' },
  failed:    { label: 'Failed',    color: 'error',   icon: 'mdi-alert-circle-outline' },
}
