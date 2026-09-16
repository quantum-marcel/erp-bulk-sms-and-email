const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

// Exercise the store without dispatching messages or requiring a browser.
function setup(statuses, dispatch, campaign = {}) {
  const toasts = []
  let posts = 0
  const code = ts.transpileModule(fs.readFileSync('src/stores/campaign.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const modules = {
    pinia: { defineStore: (_name, factory) => factory },
    vue: { ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }) },
    '@/utils/http': {
      get: async () => {
        const status = statuses.shift()
        if (!status) throw new Error('Unavailable')
        return { id: 1, status, ...campaign }
      },
      post: async () => { posts++; return dispatch() },
    },
    '@/utils/apiCall': { useApiCall: () => ({ run: async fn => { try { return await fn() } catch { return null } } }) },
    '@/stores/ui': { useUiStore: () => ({ toast: (message, type) => toasts.push({ message, type }) }) },
  }
  const context = { Error, exports: {}, require: name => {
    assert.ok(name in modules, `Unexpected import ${name}`)
    return modules[name]
  } }
  vm.runInNewContext(code, context)
  return { store: context.exports.useCampaignStore(), toasts, posts: () => posts }
}
const accepted = () => ({ campaign_id: 1, status: 'running', message: 'Accepted', total_recipients: 2 })

test('a draft without an accepted job is not reported as sending', async () => {
  const { store, toasts } = setup(['draft', 'draft'], () => ({ ...accepted(), status: 'draft', message: 'No recipients' }))
  assert.equal(await store.send(1), false)
  assert.match(store.sendErrors.value[1], /No recipients/)
  assert.equal(toasts.at(-1).type, 'warning')
})
test('dispatch failure retains the reason and refreshes status', async () => {
  const { store } = setup(['draft', 'draft'], () => { throw new Error('Worker unavailable') })
  assert.equal(await store.send(1), false)
  assert.match(store.sendErrors.value[1], /Worker unavailable/)
  assert.equal(store.currentCampaign.value.status, 'draft')
  assert.equal(store.sendingIds.value.length, 0)
})
test('a campaign already running is not dispatched again', async () => {
  const { store, posts } = setup(['running'], accepted)
  assert.equal(await store.send(1), false)
  assert.equal(posts(), 0)
})
test('a status lookup failure prevents an unsafe repeat dispatch', async () => {
  const { store, posts } = setup([], accepted)
  assert.equal(await store.send(1), false)
  assert.equal(posts(), 0)
})
test('queued jobs still represented as drafts are accepted without claiming delivery', async () => {
  const { store, toasts } = setup(['draft', 'draft'], () => ({ ...accepted(), status: 'queued', job_id: 7, message: 'Queued' }))
  assert.equal(await store.send(1), true)
  assert.equal(toasts.at(-1).message, 'Queued')
  assert.equal(toasts.at(-1).type, 'info')
})
test('concurrent sends for the same campaign dispatch only once', async () => {
  const { store, posts } = setup(['draft', 'running'], accepted)
  const results = await Promise.all([store.send(1), store.send(1)])
  assert.deepEqual(results, [true, false])
  assert.equal(posts(), 1)
})
test('a failed campaign is not returned as a successful send', async () => {
  const { store } = setup(['draft', 'failed'], () => ({ ...accepted(), status: 'failed', message: 'Delivery failed' }))
  assert.equal(await store.send(1), false)
  assert.equal(store.sendErrors.value[1], 'Delivery failed')
})

test('an SMS draft without a provider cannot dispatch from the detail screen', async () => {
  const { store, posts, toasts } = setup(['draft'], accepted, { channel: 'sms', sms_provider: null })
  assert.equal(await store.send(1), false)
  assert.equal(posts(), 0)
  assert.match(toasts.at(-1).message, /select an SMS provider/)
})
