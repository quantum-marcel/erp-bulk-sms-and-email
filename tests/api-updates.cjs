const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function load(file, modules = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const context = { exports: {}, URL, require: name => { if (name === '@/utils/domainRules') return load('src/utils/domainRules.ts', {});
    if (name === '@/utils/contactCsv') return load('src/utils/contactCsv.ts', {});
    if (name === '@/utils/smsParts') return load('src/utils/smsParts.ts', {});
    if (name === '@/utils/logSearch') return load('src/utils/logSearch.ts', {});
    if (name === '@/utils/logStatus') return load('src/utils/logStatus.ts', {});
    if (name === '@/utils/pagination') return load('src/utils/pagination.ts', {}); assert.ok(name in modules, name); return modules[name] } }
  vm.runInNewContext(code, context)
  return context.exports
}
test('acceptance without a receipt never claims delivery', () => {
  const { getLogDisplayStatus: status } = load('src/utils/logStatus.ts')
  assert.equal(status({ status: 'sent' }), 'sent')
  assert.equal(status({ channel: 'email', status: 'sent', delivery_status: 'sent' }), 'sent')
  assert.equal(status({ status: 'sent', delivery_status: 'pending' }), 'pending')
  assert.equal(status({ status: 'failed', retry_pending: true }), 'pending')
  assert.equal(status({ status: 'failed', delivery_status: 'delivered' }), 'delivered')
  assert.equal(status({ status: 'sent', delivery_status: 'failed' }), 'failed')
  assert.equal(status({ status: 'sent', delivered_at: '2026-09-15T10:00:00Z' }), 'delivered')
})
test('channel-specific statuses, filters and retry eligibility agree', () => {
  const { getLogDisplayStatus: status, matchesLogStatus, canRetryLog, getLogStatusOptions } = load('src/utils/logStatus.ts')
  const email = { channel: 'email', status: 'sent' }
  const sms = { channel: 'sms', status: 'sent' }
  assert.equal(status(email), 'sent')
  assert.equal(status(sms), 'accepted')
  assert.equal(status({ ...email, delivery_status: 'accepted' }), 'sent')
  assert.equal(status({ ...sms, delivery_status: 'delivered' }), 'delivered')
  assert.equal(status({ ...sms, delivery_status: 'unrecognized' }), 'unknown')
  assert.equal(matchesLogStatus(email, 'sent'), true)
  assert.equal(matchesLogStatus(sms, 'sent'), false)
  assert.equal(matchesLogStatus(sms, 'accepted'), true)
  for (const channel of ['email', 'sms']) {
    const failed = { channel, status: 'failed', delivery_status: 'pending' }
    assert.equal(status(failed), 'failed')
    assert.equal(canRetryLog(failed), true)
    assert.equal(canRetryLog({ ...failed, retry_pending: true }), false)
    assert.equal(canRetryLog({ ...failed, delivered_at: '2026-10-01T10:00:00Z' }), false)
    assert.equal(matchesLogStatus({ ...failed, retry_pending: true }, 'retry'), true)
  }
  assert.equal(JSON.stringify(getLogStatusOptions('email').map(x => x.label)), JSON.stringify(['All', 'Sent', 'Failed', 'Retry queued']))
  for (const receipt of [undefined, 'sent', 'accepted', 'pending', 'delivered']) {
    assert.equal(status({ ...email, delivery_status: receipt }), 'sent')
    assert.equal(matchesLogStatus({ ...email, delivery_status: receipt }, 'sent'), true)
  }
  assert.equal(status({ ...email, retry_pending: true }), 'retry')
  assert.equal(status({ ...email, delivery_status: 'failed' }), 'failed')
  assert.equal(getLogStatusOptions('email').some(x => x.value === 'accepted'), false)
  assert.equal(getLogStatusOptions('sms').some(x => x.value === 'sent'), false)
  for (const value of ['sent', 'accepted']) assert.ok(getLogStatusOptions('both').some(x => x.value === value))
})
test('unified status filtering collects all pages before slicing and keeps matching totals', async () => {
  const rows = [
    { id: 1, channel: 'sms', success: true, delivery_status: 'delivered' },
    { id: 2, channel: 'email', success: false, delivery_status: 'pending' },
    { id: 3, channel: 'sms', success: true, delivery_status: 'failed' },
    { id: 4, channel: 'email', success: true },
  ]
  const offsets = []
  const { useCampaignStore } = load('src/stores/campaign.ts', {
    pinia: { defineStore: (_, factory) => factory },
    vue: { ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }) },
    '@/utils/http': { get: async (_, params) => {
      offsets.push(params.offset)
      assert.equal(params.display_status, undefined)
      assert.equal(params.q, 'test')
      return { items: rows.slice(params.offset, params.offset + 1), offset: params.offset, limit: 1, total: rows.length }
    } },
    '@/utils/apiCall': { useApiCall: () => ({ run: fn => fn() }) },
    '@/stores/ui': { useUiStore: () => ({ toast() {} }) },
  })
  const store = useCampaignStore()
  await store.fetchLogs(9, 1, 1, { display_status: 'failed', q: 'test' })
  assert.deepEqual(offsets, [0, 1, 2, 3])
  assert.equal(store.logsTotal.value, 2)
  assert.equal(store.currentLogs.value.length, 1)
  assert.equal(store.currentLogs.value[0].id, 3)
})
test('draft PATCH preserves explicit clears, updates cached campaign, and exposes no delete', async () => {
  const requests = []
  const { useCampaignStore } = load('src/stores/campaign.ts', {
    pinia: { defineStore: (_, factory) => factory },
    vue: { ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }) },
    '@/utils/http': { patch: async (url, body) => { requests.push({ url, body }); return { id: 8, status: 'draft', ...body } } },
    '@/utils/apiCall': { useApiCall: () => ({ run: fn => fn() }) },
    '@/stores/ui': { useUiStore: () => ({ toast() {} }) },
  })
  const store = useCampaignStore()
  store.campaigns.value = [{ id: 8, scheduled_at: '2026-10-01' }]
  store.setCurrent(store.campaigns.value[0])
  const result = await store.update(8, { scheduled_at: null, subject: null, sms_provider: 'provider-a', phone_field: 'mobile' })
  assert.equal(requests[0].url, '/campaigns/8')
  assert.equal(requests[0].body.scheduled_at, null)
  assert.equal(result.phone_field, 'mobile')
  assert.equal(store.campaigns.value[0], result)
  assert.equal(store.currentCampaign.value, result)
  assert.equal(store.remove, undefined)
})
test('Compose updates drafts and ignores provider responses from a previous company', async () => {
  const auth = { activeCompany: { id: 1 }, hasCompany: true, isAdmin: false }
  const pendingProviders = []
  const source = fs.readFileSync('src/pages/compose.vue', 'utf8').match(/<script lang="ts" setup>([\s\S]*?)<\/script>/)[1]
  const requests = []
  const campaignStore = {
    create: async body => { requests.push({ method: 'POST', body }); return { id: 9, ...body } },
    update: async (id, body) => { requests.push({ method: 'PATCH', id, body }); return { id, ...body } },
    fetchOne: async () => ({ id: 9, status: 'draft' }),
  }
  const modules = {
    vue: { ref: value => ({ value }), reactive: value => value, computed: getter => ({ get value() { return getter() } }), watch() {}, onMounted() {} },
    'vue-router': { useRoute: () => ({ query: {} }), useRouter: () => ({ push() {}, replace() {} }) },
    '@/stores/auth': { useAuthStore: () => auth },
    '@/stores/campaign': { useCampaignStore: () => campaignStore },
    '@/stores/domain': { useDomainStore: () => ({ domains: [] }) },
    '@/stores/preview': { usePreviewStore: () => ({ results: {} }) },
    '@/stores/partners': { usePartnersStore: () => ({ fields: [] }) },
    '@/utils/http': { get: () => new Promise(resolve => pendingProviders.push(resolve)) },
    '@/utils/apiCall': { useApiCall: () => ({ run: fn => fn() }) },
    '@/stores/ui': { useUiStore: () => ({ toast() {} }) },
    '@/components/compose/TiptapEditor.vue': {},
    '@/components/ConfirmDialog.vue': {},
  }
  const code = ts.transpileModule(source + '\nexport { form, saveDraft, loadProviders, providers, providerItems, loadEmailConfigs, emailConfigs, hasCampaignCompany, clearForm };', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const context = { exports: {}, require: name => { if (name === '@/utils/domainRules') return load('src/utils/domainRules.ts', {});
    if (name === '@/utils/contactCsv') return load('src/utils/contactCsv.ts', {});
    if (name === '@/utils/smsParts') return load('src/utils/smsParts.ts', {});
    if (name === '@/utils/logSearch') return load('src/utils/logSearch.ts', {});
    if (name === '@/utils/logStatus') return load('src/utils/logStatus.ts', {});
    if (name === '@/utils/pagination') return load('src/utils/pagination.ts', {}); assert.ok(name in modules, name); return modules[name] } }
  vm.runInNewContext(code, context)
  const { form, saveDraft, loadProviders, providers, providerItems, loadEmailConfigs, emailConfigs } = context.exports
  Object.assign(form, { name: 'Notice', domain_id: 1, sms_body: 'Hello', sms_provider: 'provider-a', scheduled_at: '2026-10-01T08:00' })
  assert.equal(await saveDraft(), 9)
  assert.equal(await saveDraft(), 9)
  assert.equal(requests.length, 1)
  form.sms_body = 'Updated'
  form.scheduled_at = ''
  assert.equal(await saveDraft(), 9)
  assert.equal(requests.length, 2)
  assert.equal(requests[1].method, 'PATCH')
  assert.equal(requests[1].id, 9)
  assert.equal(requests[1].body.scheduled_at, null)
  assert.equal(requests[1].body.subject, null)
  assert.equal(requests[1].body.sms_provider, 'provider-a')
  form.email_field = ''
  await saveDraft()
  assert.equal(requests[2].body.email_field, undefined)
  assert.equal(requests[2].body.phone_field, 'phone')
  campaignStore.fetchOne = async () => ({ id: 9, status: 'running' })
  form.sms_body = 'Another change'
  assert.equal(await saveDraft(), null)
  assert.equal(requests.length, 3)
  auth.isAdmin = true
  assert.equal(context.exports.hasCampaignCompany.value, true)
  assert.equal(await saveDraft(), null)
  assert.equal(requests.length, 3)
  auth.isAdmin = false
  const previous = loadProviders()
  auth.activeCompany = { id: 2 }
  const latest = loadProviders()
  pendingProviders[1]([{ id: 'company-two', configured: true }, { id: 'unconfigured', configured: false }])
  await latest
  pendingProviders[0]([{ id: 'company-one', configured: true }])
  await previous
  assert.equal(providers.value[0].id, 'company-two')
  assert.equal(providerItems.value.length, 1)
  auth.activeCompany = null
  await loadProviders()
  assert.equal(providers.value.length, 0)
  auth.activeCompany = { id: 1 }
  const oldEmails = loadEmailConfigs()
  auth.activeCompany = { id: 2 }
  const newEmails = loadEmailConfigs()
  pendingProviders[3]([{ id: 22, configured: true }]); await newEmails
  pendingProviders[2]([{ id: 11, configured: true }]); await oldEmails
  assert.equal(emailConfigs.value[0].id, 22)
  campaignStore.fetchOne = async () => ({ id: 9, status: 'draft' })
  form.channel = 'email'; form.email_config_id = 22; form.phone_field = ''
  await saveDraft()
  assert.equal(requests[3].body.email_config_id, 22)
  assert.equal(requests[3].body.phone_field, undefined)
  form.email_config_id = null
  await saveDraft()
  assert.equal(requests[4].body.email_config_id, null)
})

test('SMS settings preserve secrets, replace explicitly, and validate additional settings', () => {
  const { buildSmsConfigPayload } = load('src/utils/smsConfig.ts')
  const form = { endpoint: '', sender_id: '', auth_name: '', secret: '', clear_secret: false, timeout: '', extra: '', is_default: true }
  let payload = buildSmsConfigPayload(form)
  assert.equal('secret' in payload, false)
  assert.equal('clear_secret' in payload, false)
  assert.equal(payload.is_default, true)
  payload = buildSmsConfigPayload({ ...form, secret: 'replacement' })
  assert.equal(payload.secret, 'replacement')
  payload = buildSmsConfigPayload({ ...form, clear_secret: true })
  assert.equal(payload.clear_secret, true)
  assert.equal('secret' in payload, false)
  assert.throws(() => buildSmsConfigPayload({ ...form, secret: 'replacement', clear_secret: true }), /either/)
  assert.throws(() => buildSmsConfigPayload({ ...form, timeout: -1 }), /between/)
  assert.throws(() => buildSmsConfigPayload({ ...form, extra: '[]' }), /JSON object/)
  assert.throws(() => buildSmsConfigPayload({ ...form, extra: '{broken' }), /valid JSON/)
  assert.equal(buildSmsConfigPayload({ ...form, extra: '{"option":"value"}' }).extra.option, 'value')
})

test('company SMS configuration uses company-scoped endpoints and preserves default changes', async () => {
  const calls = []
  const { useCompanyStore } = load('src/stores/company.ts', {
    pinia: { defineStore: (_, factory) => factory },
    vue: { ref: value => ({ value }) },
    '@/utils/http': {
      get: async url => { calls.push({ url }); return [] },
      put: async (url, body) => { calls.push({ url, body }); return { provider: 'quantum', configured: true, is_default: body.is_default } },
    },
    '@/utils/apiCall': { useApiCall: () => ({ run: fn => fn() }) },
  })
  const store = useCompanyStore()
  await store.fetchSmsConfigs(42)
  const result = await store.saveSmsConfig(42, 'quantum', { is_default: true, sender_id: 'Company42' })
  assert.equal(calls[0].url, '/companies/42/sms-configs')
  assert.equal(calls[1].url, '/companies/42/sms-configs/quantum')
  assert.equal(calls[1].body.sender_id, 'Company42')
  assert.equal('secret' in calls[1].body, false)
  assert.equal(result.is_default, true)
})
test('provider settings use backend identifiers once and preserve hidden overrides', async () => {
  const source = fs.readFileSync('src/components/CompanySmsSettings.vue', 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const saved = []
  const config = { provider: 'quantum_sms_provider', label: 'Quantum', endpoint: 'https://sms.example/send', configured: true, timeout: 45, extra: { account: 'existing', priority: 'high', tags: ['saved'], webhook_url: 'https://sms.example/callback' } }
  const modules = {
    vue: { ref: value => ({ value }), reactive: value => value, computed: getter => ({ get value() { return getter() } }), watch() {}, onMounted() {}, onBeforeUnmount() {} },
    '@/stores/company': { useCompanyStore: () => ({
      fetchSmsConfigs: async () => [config],
      saveSmsConfig: async (_id, provider, payload) => { saved.push({ provider, payload }); return config },
    }) },
    '@/utils/smsConfig': load('src/utils/smsConfig.ts'),
  }
  const events = []
  const context = { exports: {}, URL, defineProps: () => ({ company: { id: 1 } }), defineEmits: () => event => events.push(event), require: name => modules[name] }
  const code = ts.transpileModule(source + '\nexport { configs, providerOptions, provider, resetForm, save };', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, context)
  const { configs, providerOptions, provider, resetForm, save } = context.exports
  configs.value = [config, config, { provider: 'hubtel', label: 'Hubtel' }]
  assert.equal(providerOptions.value.length, 2)
  assert.equal(providerOptions.value[0].provider, 'quantum_sms_provider')
  provider.value = 'quantum_sms_provider'
  resetForm()
  await save()
  assert.deepEqual(events, ['saved', 'close'])
  assert.equal(saved[0].provider, 'quantum_sms_provider')
  assert.equal(saved[0].payload.timeout, 45)
  assert.equal(saved[0].payload.extra.account, 'existing')
  assert.equal(saved[0].payload.extra.priority, 'high')
  assert.equal(saved[0].payload.extra.tags[0], 'saved')
  assert.equal(saved[0].payload.extra.webhook_url, 'https://sms.example/callback')
  assert.equal('secret' in saved[0].payload, false)
})
test('provider-specific credentials and timeout boundaries are enforced', () => {
  const { buildSmsConfigPayload } = load('src/utils/smsConfig.ts')
  const form = { endpoint: 'https://sms.example/send', sender_id: '', auth_name: '', secret: '', clear_secret: false, timeout: 0, extra: '', is_default: false }
  for (const provider of ['hubtel', 'npontu']) {
    assert.throws(() => buildSmsConfigPayload(form, { provider, configured: false }), /required/)
    assert.throws(() => buildSmsConfigPayload({ ...form, auth_name: 'name' }, { provider, configured: false }), /first save/)
    assert.equal(buildSmsConfigPayload({ ...form, auth_name: 'name', secret: 'new' }, { provider, configured: false }).timeout, 0)
    assert.equal('secret' in buildSmsConfigPayload({ ...form, auth_name: 'name', timeout: 300 }, { provider, configured: true }), false)
  }
  for (const provider of ['quantum', 'quantum_sms_provider']) {
    assert.throws(() => buildSmsConfigPayload(form, { provider, configured: false }), /first save/)
    const payload = buildSmsConfigPayload({ ...form, secret: 'key' }, { provider, configured: false })
    assert.equal('auth_name' in payload, false)
    assert.equal(payload.secret, 'key')
  }
  assert.throws(() => buildSmsConfigPayload({ ...form, timeout: 301 }, { provider: 'quantum', configured: true }), /between/)
  assert.throws(() => buildSmsConfigPayload({ ...form, endpoint: '' }, { provider: 'quantum', configured: true }), /API URL is required/)
  assert.equal(buildSmsConfigPayload({ ...form, clear_secret: true }, { provider: 'quantum', configured: true }).clear_secret, true)
})

test('email settings retain passwords unless explicitly replaced or cleared and keep failed deletes visible', async () => {
  const source = fs.readFileSync('src/components/CompanyEmailSettings.vue', 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const calls = []
  const modules = {
    vue: { ref: value => ({ value }), reactive: value => value, onMounted() {} },
    '@/utils/http': {
      get: async () => [],
      post: async (url, body) => { calls.push({ url, body }); return { id: 7, ...body } },
      patch: async (url, body) => { calls.push({ url, body }); return { id: 7, ...body } },
      del: async () => { throw Error('Account is in use') },
    },
    '@/components/ConfirmDialog.vue': {},
  }
  const events = []
  const context = { exports: {}, Error, defineProps: () => ({ company: { id: 42 } }), defineEmits: () => event => events.push(event), require: name => modules[name] }
  vm.runInNewContext(ts.transpileModule(source + '\nexport { form, edit, save, remove, configs, deleteTarget, error, editingId };', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
  const { form, edit, save, remove, configs, deleteTarget, error, editingId } = context.exports
  const config = { id: 7, name: 'Office', host: 'smtp.example.com', from_email: 'office@example.com', username: 'office', password_preview: '***', enabled: true }
  edit(config)
  await save()
  assert.equal(editingId.value, 7)
  assert.deepEqual(events, ['saved', 'close'])
  assert.equal(calls[0].url, '/companies/42/email-configs/7')
  assert.equal('password' in calls[0].body, false)
  assert.equal('password_preview' in calls[0].body, false)
  edit(config); form.password = 'replacement'; await save()
  assert.equal(calls[1].body.password, 'replacement')
  edit(config); form.clear_password = true; await save()
  assert.deepEqual(events, ['saved', 'close', 'saved', 'close'])
  assert.match(error.value, /Clear the username/)
  assert.equal(calls.length, 2)
  form.username = ''; await save()
  assert.equal(calls[2].body.clear_password, true)
  assert.equal(calls[2].body.username, null)
  configs.value = [config]; deleteTarget.value = config; await remove()
  assert.equal(configs.value.length, 1)
  assert.equal(error.value, 'Account is in use')
})

test('partner metadata applies API defaults without discarding explicit unsupported fields', async () => {
  const { usePartnersStore } = load('src/stores/partners.ts', {
    pinia: { defineStore: (_, factory) => factory },
    vue: { ref: value => ({ value }) },
    '@/utils/http': { get: async () => ({ fields: [{ name: 'email' }, { name: 'private', searchable: false, supported: false }] }) },
    '@/utils/apiCall': { useApiCall: () => ({ run: fn => fn() }) },
  })
  const fields = await usePartnersStore().fetchFields(42)
  assert.equal(fields[0].supported, true)
  assert.equal(fields[0].searchable, true)
  assert.equal(fields[0].source, 'odoo')
  assert.equal(fields[1].supported, false)
})
