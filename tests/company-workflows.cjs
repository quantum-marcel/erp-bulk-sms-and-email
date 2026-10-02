const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function evaluate(source, modules = {}, globals = {}) {
  const context = { exports: {}, URL, ...globals, require: name => {
    if (name.startsWith('@/utils/') && !modules[name]) return evaluate(fs.readFileSync('src/' + name.slice(2) + '.ts', 'utf8'))
    if (name === '@/composables/useServerPage') return { useServerPage: () => ({ load: async () => {} }) }
    assert.ok(name in modules, name)
    return modules[name]
  } }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context)
  return context.exports
}
const vue = { ref: value => ({ value }), reactive: value => value, computed: getter => ({ get value() { return getter() } }), onMounted() {} }
test('log search finds nested phone/email, numbers and metadata without losing values', () => {
  const { matchesLogSearch } = evaluate(fs.readFileSync('src/utils/logSearch.ts', 'utf8'))
  const log = { recipient: 'uuid', raw: { contact_value: '+233241234567', partner: { email: 'Person@Example.com' }, attempts: 17, extra: ['custom value'] } }
  for (const q of ['UUID', '241234567', 'person@example', '17', 'custom value']) assert.equal(matchesLogSearch(log, q), true)
  assert.equal(matchesLogSearch(log, 'missing'), false)
})
test('Odoo settings preserve keys, use correct company endpoints, and provision without sending both secrets', async () => {
  const calls = []
  const events = []
  const source = fs.readFileSync('src/components/CompanyOdooSettings.vue', 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const config = { configured: true, enabled: true, key_preview: '***saved', source_url: 'https://odoo.example.com', source_db: 'db', source_username: 'admin' }
  const api = evaluate(source + '\nexport { reload, save, form, credentialMode, password, error, testConnection, refreshFields, generateKey, revokeKey, syncKey };', {
    vue,
    '@/utils/http': {
      get: async () => config,
      put: async (url, body) => { calls.push({ url, body }); return config },
      post: async (url, body) => { calls.push({ url, body }); return { configured: true, ok: true, fields: [], api_key: 'sync-test' } },
      del: async url => { calls.push({ url }) },
    },
    '@/stores/partners': { usePartnersStore: () => ({ fetchFields: async () => [] }) },
    '@/stores/auth': { useAuthStore: () => ({ activeCompany: { id: 42 } }) },
    '@/components/ConfirmDialog.vue': {},
  }, { defineProps: () => ({ company: { id: 42 } }), defineEmits: () => event => events.push(event) })
  await api.reload(); await api.save()
  assert.deepEqual(events, ['saved', 'close'])
  assert.equal(calls[0].url, '/companies/42/source')
  assert.equal('api_key' in calls[0].body, false)
  api.form.api_key = 'replacement'; await api.save()
  assert.equal(calls[1].body.api_key, 'replacement')
  api.form.clear_key = true; api.form.enabled = false; await api.save()
  assert.equal(calls[2].body.clear_key, true)
  api.credentialMode.value = 'password'; api.password.value = 'one-use'; api.form.api_key = 'unused'; await api.save()
  assert.equal(calls[3].url, '/companies/42/source/provision-key')
  assert.equal(calls[3].body.password, 'one-use')
  assert.equal('api_key' in calls[3].body, false)
  assert.equal(api.password.value, '')
  await api.testConnection(); await api.refreshFields(); await api.generateKey(); await api.revokeKey()
  assert.deepEqual(calls.slice(4).map(c => c.url), ['/companies/42/source/test', '/companies/42/source/refresh-fields', '/companies/42/api-key', '/companies/42/api-key'])
  assert.equal(api.syncKey.value, '')
})
function campaignSetup(response = { status: 'queued', job_id: 1, message: 'Queued' }) {
  const requests = []
  const api = evaluate(fs.readFileSync('src/stores/campaign.ts', 'utf8'), {
    vue, pinia: { defineStore: (_, factory) => factory },
    '@/utils/http': { get: async () => ({ id: 9, status: 'completed_with_failures' }), post: async url => { requests.push(url); return response } },
    '@/utils/apiCall': { useApiCall: () => ({ run: async fn => fn() }) },
    '@/stores/ui': { useUiStore: () => ({ toast() {} }) },
  })
  const store = api.useCampaignStore()
  store.currentLogs.value = [{ id: 7, campaign_id: 9, status: 'failed', delivery_status: 'pending', recipient: 'test' }]
  return { store, requests }
}
test('individual retries dispatch once, mark pending and reject delivered or foreign rows', async () => {
  const { store, requests } = campaignSetup()
  assert.equal(await store.retryFailed(9, 7), true)
  assert.equal(store.currentLogs.value[0].retry_pending, true)
  assert.equal(await store.retryFailed(9, 7), false)
  assert.deepEqual(requests, ['/campaigns/9/logs/7/retry'])
  store.currentLogs.value[0].retry_pending = false
  store.currentLogs.value[0].delivery_status = 'delivered'
  assert.equal(await store.retryFailed(9, 7), false)
  assert.equal(await store.retryFailed(10, 7), false)
})
test('bulk retries use campaign retry and refused retries do not mark logs pending', async () => {
  const all = campaignSetup()
  await all.store.retryFailed(9)
  assert.deepEqual(all.requests, ['/campaigns/9/retry'])
  const rejected = campaignSetup({ status: 'failed', message: 'Not accepted' })
  assert.equal(await rejected.store.retryFailed(9, 7), false)
  assert.equal(rejected.store.currentLogs.value[0].retry_pending, undefined)
})
test('saved contact lists load full detail before editing and update contacts without changing kind', async () => {
  const requests = []
  const detail = { id: 5, kind: 'list', name: 'Customers', rules: [], emails: ['one@example.com', 'two@example.com'], phones: ['+233240000000'] }
  const source = fs.readFileSync('src/pages/mailing-lists.vue', 'utf8').match(/<script lang="ts" setup>([\s\S]*?)<\/script>/)[1]
  const domainStore = {
    fetchOne: async id => { requests.push({ method: 'GET', id }); return detail },
    update: async (id, payload) => { requests.push({ method: 'PATCH', id, payload }); return { id } },
    create: async payload => { requests.push({ method: 'POST', payload }); return { id: 6 } },
  }
  const api = evaluate(source + '\nexport { openEdit, openCreate, handleSave, dlg, onCsvSelected, showDialog, saving };', {
    vue,
    '@/stores/auth': { useAuthStore: () => ({ activeCompany: { id: 1 }, hasCompany: true }) },
    '@/stores/domain': { useDomainStore: () => domainStore },
    '@/stores/ui': { useUiStore: () => ({ toast() {} }) },
    '@/stores/preview': { usePreviewStore: () => ({ invalidate() {} }) },
    '@/stores/partners': { usePartnersStore: () => ({ fields: [] }) },
    '@/components/ConfirmDialog.vue': {},
    '@/components/RecipientPreviewDialog.vue': {},
    '@/components/DomainContactsDialog.vue': {},
    '@/components/RuleGroupEditor.vue': {},
  })
  await api.openEdit({ id: 5, kind: 'list', name: 'Customers', rules: [] })
  assert.equal(api.dlg.emails, 'one@example.com\ntwo@example.com')
  api.dlg.emails += '\none@example.com\nthree@example.com'
  await api.handleSave()
  assert.equal(api.showDialog.value, false)
  assert.equal(api.saving.value, false)
  assert.equal(requests[0].method, 'GET')
  assert.equal(requests[1].payload.emails.length, 3)
  assert.equal('kind' in requests[1].payload, false)
  assert.equal('rules' in requests[1].payload, false)
  api.openCreate(); api.dlg.name = 'Phones'; api.dlg.kind = 'list'; api.dlg.phones = '+233240000000; +233240000001'
  await api.onCsvSelected({ target: { files: [{ text: async () => 'name,phone\nFirst,+233240000001\nSecond,+233240000002' }], value: 'file.csv' } }, 'phone')
  assert.equal(api.dlg.phones.split('\n').length, 3)
  await api.handleSave()
  assert.equal(requests[2].payload.kind, 'list')
  assert.equal(requests[2].payload.phones.length, 3)
  assert.equal('rules' in requests[2].payload, false)
  assert.equal(api.showDialog.value, false)
  api.openCreate(); api.dlg.name = 'Retry'; api.dlg.kind = 'list'
  domainStore.create = async () => null
  await api.handleSave()
  assert.equal(api.showDialog.value, true)
  assert.equal(api.saving.value, false)
  assert.equal(api.dlg.name, 'Retry')
  domainStore.create = async () => { throw Error('Unexpected failure') }
  await assert.rejects(api.handleSave(), /Unexpected failure/)
  assert.equal(api.showDialog.value, true)
  assert.equal(api.saving.value, false)
})
test('phone search ignores display punctuation and searches numeric values', () => {
  const { matchesLogSearch } = evaluate(fs.readFileSync('src/utils/logSearch.ts', 'utf8'))
  assert.equal(matchesLogSearch({ phone: '+233 (20) 770-3492' }, '233207703492'), true)
  assert.equal(matchesLogSearch({ phone: 233207703492 }, '+233 20 770 3492'), true)
  assert.equal(matchesLogSearch({ phone: '+233207703492' }, '999999'), false)
})
test('SMS preview respects single/multipart boundaries, extended characters and Unicode without losing text', () => {
  const { smsParts } = evaluate(fs.readFileSync('src/utils/smsParts.ts', 'utf8'))
  assert.equal(smsParts('').parts.length, 0)
  assert.equal(smsParts('a'.repeat(160)).parts.length, 1)
  assert.equal(smsParts('a'.repeat(160)).remaining, 0)
  const multipart = smsParts('a'.repeat(161))
  assert.equal(multipart.parts[0].text.length, 153)
  assert.equal(multipart.parts[1].text.length, 8)
  assert.equal(smsParts('^'.repeat(80)).parts.length, 1)
  assert.equal(smsParts('^'.repeat(81)).parts.length, 2)
  assert.equal(smsParts('漢'.repeat(70)).parts.length, 1)
  assert.equal(smsParts('漢'.repeat(71)).capacity, 67)
  for (const text of ['x'.repeat(152) + '^' + 'y'.repeat(20), '😀'.repeat(40), 'one\n two  ']) {
    const result = smsParts(text)
    assert.equal(result.parts.map(part => part.text).join(''), text)
    assert.ok(result.parts.every(part => part.units <= result.capacity))
    assert.ok(result.parts.every(part => !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(part.text)))
  }
})
test('delivery search queries backend contact index even when returned logs only contain UUIDs', async () => {
  const calls = []
  const { useCampaignStore } = evaluate(fs.readFileSync('src/stores/campaign.ts', 'utf8'), {
    vue, pinia: { defineStore: (_, factory) => factory },
    '@/utils/http': { get: async (url, params) => {
      calls.push({ url, params })
      return { items: [{ id: 1, recipient_ref: 'uuid-only', channel: 'sms', success: true }], total: 1, limit: 200, offset: 0 }
    } },
    '@/utils/apiCall': { useApiCall: () => ({ run: fn => fn() }) },
    '@/stores/ui': { useUiStore: () => ({ toast() {} }) },
  })
  const store = useCampaignStore()
  const result = await store.searchLogs(9, '+233207703492')
  assert.equal(calls[0].url, '/campaigns/9/logs')
  assert.equal(calls[0].params.q, '+233207703492')
  assert.equal(result[0].recipient, 'uuid-only')
  assert.equal(store.currentLogs.value.length, 0)
})
test('nested rules preserve AND/OR/NOT, typed values and strict payload fields', () => {
  const { prepareRules, countRules, ruleSummary } = evaluate(fs.readFileSync('src/utils/domainRules.ts', 'utf8'))
  const rules = [
    { match: 'OR', negate: false, rules: [{ field: 'name', op: 'eq', value: 'Marcel' }, { field: 'name', op: 'eq', value: 'Zeus' }] },
    { match: 'AND', negate: true, rules: [{ field: 'active', op: 'eq', value: false }, { field: 'balance', op: 'in', value: [0, 10] }] },
    { field: 'balance', op: 'gt', value: 0 },
  ]
  assert.equal(JSON.stringify(prepareRules(rules, [])), JSON.stringify(rules))
  assert.equal(countRules(rules), 5)
  assert.equal(ruleSummary(rules[0], key => key), '(name is equal to Marcel OR name is equal to Zeus)')
  assert.match(ruleSummary(rules[1], key => key), /^NOT \(/)
  const normalized = prepareRules([{ field: 'balance', op: 'gte', value: '12.5', uiId: 8 }, { field: 'name', op: 'is_null', value: 'old' }], [{ name: 'balance', ttype: 'float' }])
  assert.equal(normalized[0].value, 12.5)
  assert.equal('uiId' in normalized[0], false)
  assert.equal('value' in normalized[1], false)
  assert.throws(() => prepareRules([{ match: 'AND', rules: [] }], []), /at least one/)
  assert.throws(() => prepareRules([{ field: '', op: 'eq', value: 'x' }], []), /Choose a field/)
  assert.throws(() => prepareRules([{ field: 'name', op: 'in', value: 'invalid' }], []), /JSON array/)
  assert.equal(prepareRules([{ field: 'name', op: 'in', value: '["a","b"]' }], [])[0].value.length, 2)
})
test('editing a grouped mailing list preserves nested structure and typed values through PATCH', async () => {
  const requests = []
  const rules = [{ match: 'OR', negate: true, rules: [{ field: 'active', op: 'eq', value: false }, { field: 'id', op: 'in', value: [1, 2] }] }, { field: 'balance', op: 'gt', value: 0 }]
  const source = fs.readFileSync('src/pages/mailing-lists.vue', 'utf8').match(/<script lang="ts" setup>([\s\S]*?)<\/script>/)[1]
  const api = evaluate(source + '\nexport { openEdit, handleSave, dlg };', {
    vue,
    '@/stores/auth': { useAuthStore: () => ({ activeCompany: { id: 1 } }) },
    '@/stores/domain': { useDomainStore: () => ({ update: async (id, payload) => { requests.push(payload); return { id } } }) },
    '@/stores/preview': { usePreviewStore: () => ({ invalidate() {} }) },
    '@/stores/partners': { usePartnersStore: () => ({ fields: [] }) },
    '@/stores/ui': { useUiStore: () => ({ toast() {} }) },
    '@/components/RuleGroupEditor.vue': {}, '@/components/ConfirmDialog.vue': {},
    '@/components/RecipientPreviewDialog.vue': {}, '@/components/DomainContactsDialog.vue': {},
  })
  await api.openEdit({ id: 5, kind: 'rules', name: 'Grouped', rules, rule_logic: 'AND' })
  assert.notEqual(api.dlg.rules, rules)
  await api.handleSave()
  assert.equal(JSON.stringify(requests[0].rules), JSON.stringify(rules))
  assert.equal(requests[0].rule_logic, 'AND')
})
test('preview pages send offset and query, normalize campaign totals and leave compose counts untouched', async () => {
  const calls = []
  let resolvePending
  const { usePreviewStore } = evaluate(fs.readFileSync('src/stores/preview.ts', 'utf8'), {
    vue, pinia: { defineStore: (_, factory) => factory },
    '@/utils/http': { post: async (url, body) => {
      calls.push({ url, body })
      if (body.q === 'late') return new Promise(resolve => { resolvePending = resolve })
      if (url.includes('/campaign/')) return { campaign_name: 'Test', domain_id: null, total: 2, sample: [{ email: 'x@example.com' }], limit: body.limit, offset: body.offset }
      return { domain_id: 5, domain_name: 'Test', total_matched: 1, sample: [], limit: body.limit, offset: body.offset }
    } },
    '@/utils/apiCall': { useApiCall: () => ({ run: fn => fn() }) },
  })
  const store = usePreviewStore()
  store.results.value[5] = { total_matched: 123 }
  await store.previewPage(5, 20, 40, 'Marcel')
  assert.equal(calls[0].url, '/preview/')
  assert.equal(calls[0].body.offset, 40)
  assert.equal(calls[0].body.q, 'Marcel')
  assert.equal(store.results.value[5].total_matched, 123)
  const result = await store.previewPage(null, 20, 0, 'x@example.com', 9)
  assert.equal(calls[1].url, '/preview/campaign/9')
  assert.equal('domain_id' in calls[1].body, false)
  assert.equal(result.total_matched, 2)
  const pending = store.previewPage(5, 20, 0, 'late')
  store.reset()
  resolvePending({ domain_id: 5, total_matched: 999, sample: [] })
  assert.equal(await pending, null)
})
