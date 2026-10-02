const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function load(file, modules = {}) {
  const context = { exports: {}, require: name => {
    if (name === '@/utils/logStatus') return load('src/utils/logStatus.ts', {});
    if (name === '@/utils/pagination') return load('src/utils/pagination.ts')
    assert.ok(name in modules, name)
    return modules[name]
  } }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
  return context.exports
}
const { fetchAllPages } = load('src/utils/pagination.ts')
test('collects every page, including a server-shortened page, without passing envelopes to components', async () => {
  const offsets = []
  const result = await fetchAllPages(async (_, params) => {
    offsets.push(params.offset)
    assert.equal(params.limit, 200)
    return { items: [{ id: params.offset + 1 }], total: 3, limit: 1, offset: params.offset }
  }, '/companies/')
  assert.equal(JSON.stringify(result), '[{"id":1},{"id":2},{"id":3}]')
  assert.deepEqual(offsets, [0, 1, 2])
})
test('handles empty pages and legacy arrays; rejects malformed or incomplete pages', async () => {
  assert.equal((await fetchAllPages(async () => ({ items: [], total: 0, offset: 0, limit: 200 }), '/companies/')).length, 0)
  assert.equal((await fetchAllPages(async () => [{ id: 1 }], '/companies/')).length, 1)
  for (const value of [{}, { items: null }, { items: [], total: 3, offset: 0 }]) {
    await assert.rejects(fetchAllPages(async () => value, '/companies/'), /paginated response/)
  }
})
test('stops pagination after a workspace change', async () => {
  let current = true
  let calls = 0
  const result = await fetchAllPages(async () => {
    calls++
    current = false
    return { items: [{ id: 1 }], total: 2, offset: 0, limit: 1 }
  }, '/campaigns/', {}, () => current)
  assert.equal(result.length, 0)
  assert.equal(calls, 1)
})
function setup(name) {
  const calls = []
  const modules = {
    pinia: { defineStore: (_, factory) => factory },
    vue: { ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }) },
    '@/utils/http': {
      get: async (url, params) => {
        calls.push({ url, params })
        return { items: [{ id: params.offset + 1, recipient_ref: 'test', success: true }], total: 2, offset: params.offset, limit: 1 }
      },
      post: async (url, body) => { calls.push({ url, body }); return { id: 3, name: body.name, api_key: 'one-time-test-key' } },
    },
    '@/utils/apiCall': { useApiCall: () => ({ run: fn => fn() }) },
    '@/stores/ui': { useUiStore: () => ({ toast() {} }) },
  }
  const exports = load(`src/stores/${name}.ts`, modules)
  return { store: Object.values(exports)[0](), calls }
}
for (const [name, field] of [['company', 'companies'], ['campaign', 'campaigns'], ['domain', 'domains'], ['user', 'users']]) {
  test(`${name} store consumes paginated lists`, async () => {
    const { store } = setup(name)
    await store.fetchAll()
    assert.equal(store[field].value.length, 2)
    if (name === 'user') {
      await store.fetchAssignments()
      assert.equal(store.assignments.value.length, 2)
    }
    if (name === 'campaign') {
      await store.fetchLogs(1)
      assert.equal(store.currentLogs.value.length, 1)
      assert.equal(store.logsTotal.value, 2)
      assert.equal(store.currentLogs.value[0].recipient, 'test')
    }
  })
}
test('company creation keeps the documented endpoint and returns a one-time key without caching it', async () => {
  const { store, calls } = setup('company')
  const payload = { name: 'Test', generate_api_key: true, sms_configs: [{ provider: 'quantum' }] }
  const result = await store.create(payload)
  assert.equal(calls[0].url, '/companies/')
  assert.equal(calls[0].body, payload)
  assert.equal(result.api_key, 'one-time-test-key')
  assert.equal(store.companies.value[0].api_key, undefined)
})
