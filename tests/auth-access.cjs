const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function compile(file, modules, replaceMeta = false) {
  let source = fs.readFileSync(file, 'utf8')
  if (replaceMeta) source = source.replace(/import\.meta/g, '({ env: {} })')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const context = { exports: {}, require: name => { if (name === '@/utils/logStatus') return compile('src/utils/logStatus.ts', {});
    if (name === '@/utils/pagination') return compile('src/utils/pagination.ts', {}); assert.ok(name in modules, name); return modules[name] } }
  vm.runInNewContext(code, context)
  return context.exports
}
const roles = compile('src/utils/authRole.ts', {})
function setup(loginResponse, meResponse, companies = [{ id: 1, name: 'Newgas' }, { id: 2, name: 'Quantum Group' }]) {
  const calls = []
  let resets = 0
  const workspace = { reset: () => { resets++ }, fetchAll: async () => {} }
  const modules = {
    pinia: { defineStore: (_name, factory) => factory },
    vue: { ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }) },
    '@/utils/authRole': roles,
    '@/utils/http': {
      setupHttpCallbacks() {},
      post: async (url, payload) => {
        calls.push({ url, payload })
        if (url === '/auth/login') return loginResponse
        return { access_token: `scoped-${payload.company_id}`, company: companies.find(c => c.id === payload.company_id) }
      },
      get: async url => { calls.push({ url }); return url === '/auth/me' ? meResponse : { items: companies, total: companies.length, limit: 200, offset: 0 } },
    },
  }
  for (const [module, factory] of [['campaign', 'useCampaignStore'], ['domain', 'useDomainStore'], ['partners', 'usePartnersStore'], ['preview', 'usePreviewStore'], ['company', 'useCompanyStore'], ['user', 'useUserStore']]) {
    modules[`@/stores/${module}`] = { [factory]: () => workspace }
  }
  const store = compile('src/stores/auth.ts', modules, true).useAuthStore()
  return { store, calls, companies, resets: () => resets }
}
test('roles come from backend flags and unknown roles never grant administration', () => {
  assert.equal(roles.resolveAuthRole('user'), 'user')
  assert.equal(roles.resolveAuthRole('admin'), 'admin')
  assert.equal(roles.resolveAuthRole('admin', false), 'user')
  assert.equal(roles.resolveAuthRole(null, true), 'admin')
  assert.equal(roles.resolveAuthRole(undefined), 'user')
  assert.equal(roles.resolveAuthRole('unexpected'), 'user')
})
test('ordinary user auto-selects its sole company and cannot switch to another', async () => {
  const { store, calls } = setup({ access_token: 'login', username: 'randoh', name: 'Rhoda', is_admin: false, companies: [{ id: 1, name: 'Newgas' }], active_company: null })
  await store.login({ username: 'randoh', password: 'synthetic' })
  assert.equal(store.user.value.role, 'user')
  assert.equal(store.activeCompany.value.id, 1)
  assert.equal(store.token.value, 'scoped-1')
  assert.equal(calls.some(c => c.url === '/companies/'), false)
  await assert.rejects(store.selectCompany(2), /access/)
})
test('admin automatically selects the first company and can switch context', async () => {
  const { store, companies, calls } = setup({ access_token: 'login', username: 'admin', role: 'admin', companies: [], active_company: { id: 2, name: 'Quantum Group' } })
  await store.login({ username: 'admin', password: 'synthetic' })
  assert.equal(store.isAdmin.value, true)
  assert.equal(JSON.stringify(store.companies.value), JSON.stringify(companies))
  assert.equal(store.activeCompany.value.id, 1)
  assert.equal(store.token.value, 'scoped-1')
  assert.equal(store.companySelectionConfirmed.value, true)
  assert.equal(calls.find(c => c.url === '/auth/select-company').payload.company_id, 1)
  await store.selectCompany(2)
  assert.equal(store.activeCompany.value.id, 2)
  assert.equal(store.companyName(2), 'Quantum Group')
  assert.equal(store.companySelectionConfirmed.value, true)
  await store.refreshCompanies()
  assert.equal(store.activeCompany.value.id, 2)
  assert.equal(calls.filter(c => c.url === '/auth/select-company').length, 2)
})
test('admin without any companies remains without a company context', async () => {
  const { store, calls } = setup({ access_token: 'login', username: 'admin', role: 'admin', companies: [], active_company: null }, null, [])
  await store.login({ username: 'admin', password: 'synthetic' })
  assert.equal(store.activeCompany.value, null)
  assert.equal(store.companySelectionConfirmed.value, false)
  assert.equal(calls.some(c => c.url === '/auth/select-company'), false)
})
test('restored admin session without a selection automatically selects the first company', async () => {
  const { store } = setup(null, { user_id: 1, username: 'admin', role: 'admin' })
  store.token.value = 'restored'
  store.user.value = { username: 'admin', role: 'admin' }
  assert.equal(await store.checkAuth(), true)
  assert.equal(store.activeCompany.value.id, 1)
  assert.equal(store.token.value, 'scoped-1')
})
test('restored demonstration role is revalidated and downgraded to backend user', async () => {
  const { store, resets } = setup(null, { user_id: 1, username: 'randoh', name: 'Rhoda', is_admin: false, company_id: 1, company_name: 'Newgas' })
  store.token.value = 'restored'
  store.user.value = { username: 'randoh', role: 'super_admin' }
  store.companies.value = [{ id: 1, name: 'Newgas' }, { id: 2, name: 'Quantum Group' }]
  assert.equal(await store.checkAuth(), true)
  assert.equal(store.user.value.role, 'user')
  assert.equal(store.companies.value.length, 1)
  store.logout()
  assert.equal(store.token.value, null)
  assert.equal(store.activeCompany.value, null)
  assert.ok(resets() >= 6)
})
test('administration pages reject user navigation and accept admin navigation', async () => {
  const auth = { isAuthenticated: true, isAdmin: false, hasCompany: true, checkAuth: async () => true }
  let guard
  const router = { beforeEach: fn => { guard = fn } }
  compile('src/router/index.ts', {
    'vue-router': { createRouter: () => router, createWebHistory() {} },
    'virtual:generated-layouts': { setupLayouts: routes => routes },
    'vue-router/auto-routes': { routes: [] },
    '@/stores/auth': { useAuthStore: () => auth },
  }, true)
  const visit = async path => {
    let destination = 'allowed'
    await guard({ path, query: {} }, {}, value => { if (value) destination = value })
    return destination
  }
  for (const path of ['/companies', '/users', '/assignments']) assert.equal(await visit(path), '/dashboard')
  for (const path of ['/dashboard', '/mailing-lists', '/compose', '/campaigns']) assert.equal(await visit(path), 'allowed')
  auth.isAdmin = true
  for (const path of ['/companies', '/users', '/assignments']) assert.equal(await visit(path), 'allowed')
  auth.hasCompany = false
  assert.equal(await visit('/campaign-detail-1'), '/campaigns')
})
test('sidebar puts mailing lists first and hides administration from users', () => {
  const source = fs.readFileSync('src/components/NavBar.vue', 'utf8').match(/<script lang="ts" setup>([\s\S]*?)<\/script>/)[1]
  const auth = { isAdmin: false }
  const modules = {
    vue: { computed: getter => ({ get value() { return getter() } }) },
    '@/stores/auth': { useAuthStore: () => auth },
    '@/stores/ui': { useUiStore: () => ({ isMobile: false, drawerRail: false }) },
    '@/stores/campaign': { useCampaignStore: () => ({ draftCount: 0 }) },
  }
  const code = ts.transpileModule(source + '\nexport { navGroups };', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const context = { exports: {}, defineEmits: () => () => {}, require: name => modules[name] }
  vm.runInNewContext(code, context)
  const paths = () => context.exports.navGroups.value.flatMap(g => g.items.map(item => item.to))
  assert.equal(paths().includes('/users'), false)
  assert.ok(paths().indexOf('/mailing-lists') < paths().indexOf('/compose'))
  auth.isAdmin = true
  for (const path of ['/companies', '/users']) assert.ok(paths().includes(path))
  assert.equal(paths().includes('/assignments'), false)
})
test('old company responses cannot restore campaigns after a company switch', async () => {
  let resolveRequest
  const { useCampaignStore } = compile('src/stores/campaign.ts', {
    pinia: { defineStore: (_, factory) => factory },
    vue: { ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }) },
    '@/utils/http': { get: () => new Promise(resolve => { resolveRequest = resolve }) },
    '@/utils/apiCall': { useApiCall: () => ({ run: fn => fn() }) },
    '@/stores/ui': { useUiStore: () => ({ toast() {} }) },
  })
  const store = useCampaignStore()
  const oldFetch = store.fetchAll()
  store.reset()
  resolveRequest([{ id: 1, company_id: 1 }])
  await oldFetch
  assert.equal(store.campaigns.value.length, 0)
})

test('admin can select an authorized company beyond the initially loaded page', async () => {
  const { store, calls } = setup({ access_token: 'login', username: 'admin', role: 'admin', companies: [], active_company: null })
  await store.login({ username: 'admin', password: 'synthetic' })
  store.companies.value = [{ id: 1, name: 'Newgas' }]
  await store.selectCompany(2)
  assert.equal(store.activeCompany.value.id, 2)
  assert.equal(store.companies.value.some(company => company.id === 2), true)
  assert.equal(calls.filter(call => call.url === '/companies/').length, 1)
  assert.equal(calls.some(call => call.url === '/campaigns/' || call.url === '/domains/'), false)
})
