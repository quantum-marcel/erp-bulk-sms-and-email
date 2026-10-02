import type { CampaignLog } from '@/types/sms'

// Provider acceptance does not establish delivery. Only explicit receipts do.
export type LogDisplayStatus = 'delivered' | 'accepted' | 'sent' | 'pending' | 'failed' | 'unknown' | 'retry'

export function getLogDisplayStatus(log: CampaignLog): LogDisplayStatus {
  const receipt = log.delivery_status?.trim().toLowerCase()
  if (log.channel === 'email') {
    // Email reports send outcomes; SMS receipt states are not email statuses.
    if (receipt === 'delivered' || log.delivered_at) return 'sent'
    if (log.retry_pending) return 'retry'
    if (log.status === 'failed' || receipt === 'failed') return 'failed'
    return log.status === 'sent' ? 'sent' : 'unknown'
  }
  if (receipt === 'delivered' || log.delivered_at) return 'delivered'
  if (log.retry_pending) return 'pending'
  // A failed send can retain a pending receipt; it must still expose Retry.
  if (receipt === 'failed' || log.status === 'failed') return 'failed'
  if (receipt === 'pending') return 'pending'
  if (receipt === 'accepted' || receipt === 'sent') return 'accepted'
  if (receipt) return 'unknown'
  if (log.status === 'sent') return log.channel === 'sms' ? 'accepted' : 'sent'
  return 'unknown'
}

export function canRetryLog(log: CampaignLog): boolean {
  return !log.retry_pending && getLogDisplayStatus(log) === 'failed'
}

export function matchesLogStatus(log: CampaignLog, status: string): boolean {
  if (status === 'all') return true
  if (status === 'retry') return !!log.retry_pending
  return getLogDisplayStatus(log) === status
}

export function getLogStatusOptions(channel?: string) {
  const values: LogDisplayStatus[] = channel === 'email'
    ? ['sent', 'failed']
    : channel === 'sms'
      ? ['accepted', 'delivered', 'pending', 'failed', 'unknown']
      : ['sent', 'accepted', 'delivered', 'pending', 'failed', 'unknown']
  return [
    { value: 'all', label: 'All' },
    ...values.map(value => ({ value, label: LOG_STATUS_META[value].label })),
    { value: 'retry', label: 'Retry queued' },
  ]
}

export const LOG_STATUS_META: Record<LogDisplayStatus, { label: string; color: string; icon: string }> = {
  retry: { label: 'Retry queued', color: 'warning', icon: 'mdi-clock-outline' },
  sent: { label: 'Sent', color: 'info', icon: 'mdi-send-check-outline' },
  unknown: { label: 'Unknown', color: 'grey', icon: 'mdi-help-circle-outline' },
  delivered: { label: 'Delivered', color: 'success', icon: 'mdi-check-all' },
  accepted:  { label: 'Accepted', color: 'info', icon: 'mdi-send-check-outline' },
  pending:   { label: 'Pending',   color: 'warning', icon: 'mdi-clock-outline' },
  failed:    { label: 'Failed',    color: 'error',   icon: 'mdi-alert-circle-outline' },
}
