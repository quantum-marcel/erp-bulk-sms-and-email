import type { CampaignLog } from '@/types/sms'

// Per-recipient delivery status, collapsed to exactly what Quantum SMS actually
// tells us: a message is accepted and pending, then the webhook later confirms
// it was delivered or failed. There is no separate "sent" state — a message is
// either still pending confirmation, confirmed delivered, or confirmed/attempted failed.
export type LogDisplayStatus = 'delivered' | 'pending' | 'failed'

export function getLogDisplayStatus(log: CampaignLog): LogDisplayStatus {
  if (log.status === 'failed' || log.delivery_status === 'failed') return 'failed'
  if (log.delivery_status === 'delivered') return 'delivered'
  return 'pending'
}

export const LOG_STATUS_META: Record<LogDisplayStatus, { label: string; color: string; icon: string }> = {
  delivered: { label: 'Delivered', color: 'success', icon: 'mdi-check-all' },
  pending:   { label: 'Pending',   color: 'warning', icon: 'mdi-clock-outline' },
  failed:    { label: 'Failed',    color: 'error',   icon: 'mdi-alert-circle-outline' },
}
