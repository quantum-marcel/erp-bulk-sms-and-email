const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function evaluate(source, modules) {
  const context = { exports: {}, Error, require: name => {
    if (name === '@/utils/pagination') return evaluate(fs.readFileSync('src/utils/pagination.ts', 'utf8'), {})
    assert.ok(name in modules, name)
    return modules[name]
  } }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context)
  return context.exports
}
const vue = { ref: value => ({ value }), reactive: value => value, computed: fn => ({ get value() { return fn() } }), watch() {} }
test('existing access loads all matching pages and excludes other users with similar usernames', async () => {
  const offsets = []
  const rows = [{ user_id: 2, company_id: 99 }, { user_id: 1, company_id: 7 }, { user_id: 1, company_id: 8 }]
  const store = evaluate(fs.readFileSync('src/stores/user.ts', 'utf8'), {
    vue, pinia: { defineStore: (_, fn) => fn }, '@/utils/apiCall': {},
    '@/utils/http': { get: async (url, params) => {
      assert.equal(url, '/users/assignments'); assert.equal(params.q, 'ann'); offsets.push(params.offset)
      return { items: [rows[params.offset]], offset: params.offset, total: 3, limit: 1 }
    } },
  }).useUserStore()
  assert.equal(JSON.stringify(await store.fetchCompanyIds({ id: 1, username: 'ann' })), '[7,8]')
  assert.deepEqual(offsets, [0, 1, 2])
})
function formSetup(fetchCompanyIds) {
  const calls = []
  const source = fs.readFileSync('src/pages/users.vue', 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const form = evaluate(source + '\nexport { openCreate, openEdit, closeDialog, loadAccess, save, form, accessLoading, accessError, showDialog };', {
    vue, '@/utils/http': { get: async id => ({ name: id }) },
    '@/composables/useServerPage': { useServerPage: () => ({ items: { value: [] }, search: { value: '' }, load: async () => {} }) },
    '@/stores/user': { useUserStore: () => ({ fetchCompanyIds,
      create: async body => { calls.push({ method: 'POST', body }); return { id: 1 } },
      update: async (id, body) => { calls.push({ method: 'PATCH', id, body }); return { id } },
    }) },
  })
  return { ...form, calls }
}
const user = { id: 1, username: 'ann', is_active: true, is_admin: false }
test('create and edit send company access with the user, including explicit removal of all access', async () => {
  const api = formSetup(async () => [7, 8])
  api.openCreate(); api.form.username = ' ann '; api.form.company_ids = [7, 8]; await api.save()
  assert.equal(api.calls[0].method, 'POST'); assert.equal(api.calls[0].body.username, 'ann')
  assert.equal(JSON.stringify(api.calls[0].body.company_ids), '[7,8]')
  api.openEdit(user); await api.loadAccess(); await api.save()
  assert.equal(JSON.stringify(api.calls[1].body.company_ids), '[7,8]')
  api.openEdit(user); await api.loadAccess(); api.form.company_ids = []; await api.save()
  assert.equal(api.calls[2].method, 'PATCH'); assert.equal(JSON.stringify(api.calls[2].body.company_ids), '[]')
})
test('pending or failed access lookup cannot save, and stale lookups cannot alter a new user', async () => {
  let resolve
  const api = formSetup(() => new Promise(r => { resolve = r }))
  api.openEdit(user); await api.save(); assert.equal(api.calls.length, 0)
  api.closeDialog(); api.openCreate(); resolve([99]); await Promise.resolve(); await Promise.resolve()
  assert.equal(api.form.company_ids.length, 0)
  const failed = formSetup(async () => { throw Error('Lookup failed') })
  failed.openEdit(user); await failed.loadAccess(); await failed.save()
  assert.equal(failed.accessError.value, 'Lookup failed'); assert.equal(failed.calls.length, 0)
  assert.equal(failed.showDialog.value, true)
})
