import type { SmsConfigUpsert } from '@/types/company'

export interface SmsConfigForm {
  endpoint: string
  sender_id: string
  auth_name: string
  secret: string
  clear_secret: boolean
  timeout: number | string | null
  webhook_url?: string
  extra: string
  is_default: boolean
}

export function isQuantumProvider(provider: string) {
  return provider === 'quantum_sms_provider' || provider === 'quantum'
}

export function buildSmsConfigPayload(form: SmsConfigForm, context?: { provider: string; configured: boolean }): SmsConfigUpsert {
  if (context) {
    if (!['hubtel', 'npontu', 'quantum_sms_provider', 'quantum'].includes(context.provider)) throw new Error('Select a supported SMS provider.')
    if (!form.endpoint.trim()) throw new Error('API URL is required.')
    if (!/^https?:\/\//i.test(form.endpoint.trim())) throw new Error('Enter an HTTP or HTTPS API URL.')
    try { new URL(form.endpoint.trim()) } catch { throw new Error('Enter a valid API URL.') }
    if (!isQuantumProvider(context.provider) && !form.auth_name.trim()) throw new Error(context.provider === 'hubtel' ? 'Client ID is required.' : 'Username is required.')
    if (!context.configured && !form.secret.trim()) throw new Error('A secret is required for the first save.')
  }
  if (form.secret && form.clear_secret) throw new Error('Choose either a replacement secret or clearing the existing secret.')
  const timeout = form.timeout === '' || form.timeout == null ? null : Number(form.timeout)
  if (timeout != null && (!Number.isFinite(timeout) || timeout < 0 || timeout > 300)) throw new Error('Timeout must be between 0 and 300 seconds.')
  let extra: Record<string, unknown> | null = null
  if (form.extra.trim()) {
    try { extra = JSON.parse(form.extra) }
    catch { throw new Error('Additional settings must be valid JSON.') }
    if (!extra || Array.isArray(extra) || typeof extra !== 'object') throw new Error('Additional settings must be a JSON object.')
  }
  if (context && isQuantumProvider(context.provider) && form.webhook_url !== undefined) {
    const webhookUrl = form.webhook_url.trim()
    if (webhookUrl) {
      try {
        const url = new URL(webhookUrl)
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
      } catch { throw new Error('Enter a valid HTTP or HTTPS webhook URL.') }
      extra = { ...extra, webhook_url: webhookUrl }
    } else if (extra) {
      delete extra.webhook_url
      if (!Object.keys(extra).length) extra = null
    }
  }
  const payload: SmsConfigUpsert = {
    endpoint: form.endpoint.trim() || null,
    sender_id: form.sender_id.trim() || null,
    ...(context && isQuantumProvider(context.provider) ? {} : { auth_name: form.auth_name.trim() || null }),
    timeout,
    extra,
    is_default: form.is_default,
  }
  // A masked preview is never an input. Empty input preserves the stored secret.
  if (form.secret) payload.secret = form.secret
  if (form.clear_secret) payload.clear_secret = true
  return payload
}
