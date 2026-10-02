const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
function compile(file, modules, globals = {}) {
  const context = { exports: {}, Error, require: name => {
    assert.ok(name in modules, name)
    return modules[name]
  }, ...globals }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
  return context.exports
}
const pagination = compile('src/utils/pagination.ts', {})
const flush = () => new Promise(resolve => setImmediate(resolve))
function setup(get) {
  let dispose
  let timer
  const scope = vue.effectScope()
  const { useServerPage } = compile('src/composables/useServerPage.ts', {
    vue: { ...vue, onBeforeUnmount: fn => { dispose = fn } },
    '@/utils/http': { get },
    '@/utils/pagination': pagination,
  }, { setTimeout: fn => { timer = fn; return 1 }, clearTimeout: () => { timer = undefined } })
  const status = vue.ref('draft')
  const path = vue.ref('/campaigns/')
  const state = scope.run(() => useServerPage(() => path.value, () => ({ status: status.value }), 20))
  return { state, status, path, search: async value => { state.search.value = value; timer?.(); await flush() }, dispose: () => { dispose(); scope.stop() } }
}
const result = (params, total = 41) => ({ items: [{ id: params.offset + 1 }], total, limit: params.limit, offset: params.offset })
test('page navigation makes one bounded request and forwards filters; search and page size reset the offset', async () => {
  const calls = []
  const ctx = setup(async (_, params) => { calls.push(params); return result(params) })
  await flush()
  assert.equal(calls.length, 1)
  assert.equal(ctx.state.total.value, 41)
  ctx.state.page.value = 3
  await flush()
  assert.equal(calls.at(-1).offset, 40)
  await ctx.search(' customer ')
  assert.equal(ctx.state.page.value, 1)
  assert.equal(calls.at(-1).q, 'customer')
  assert.equal(calls.at(-1).status, 'draft')
  ctx.state.page.value = 2
  await flush()
  ctx.status.value = 'failed'
  await flush()
  assert.equal(calls.at(-1).offset, 0)
  assert.equal(calls.at(-1).status, 'failed')
  ctx.state.pageSize.value = 50
  await flush()
  assert.equal(calls.at(-1).limit, 50)
  ctx.dispose()
})
test('late requests and responses after unmount cannot overwrite current page data', async () => {
  const pending = []
  const ctx = setup((_, params) => new Promise(resolve => pending.push(() => resolve(result(params)))))
  ctx.state.page.value = 2
  await flush()
  pending[1]()
  await flush()
  assert.equal(ctx.state.items.value[0].id, 21)
  pending[0]()
  await flush()
  assert.equal(ctx.state.items.value[0].id, 21)
  ctx.state.page.value = 3
  await flush()
  ctx.dispose()
  pending[2]()
  await flush()
  assert.equal(ctx.state.items.value.length, 0)
})
test('deleting the last item on a page returns to the last valid page', async () => {
  let total = 41
  const calls = []
  const ctx = setup(async (_, params) => { calls.push(params); return result(params, total) })
  await flush()
  ctx.state.page.value = 3
  await flush()
  total = 40
  await ctx.state.load()
  await flush()
  assert.equal(ctx.state.page.value, 2)
  assert.equal(calls.at(-1).offset, 20)
  ctx.dispose()
})
test('failed pages clear stale rows and can be retried; empty pages keep a valid page number', async () => {
  let fail = false
  let total = 1
  const ctx = setup(async (_, params) => {
    if (fail) throw new Error('offline')
    return { ...result(params, total), items: total ? [{ id: 1 }] : [] }
  })
  await flush()
  fail = true
  await ctx.state.load()
  assert.equal(ctx.state.error.value, 'offline')
  assert.equal(ctx.state.items.value.length, 0)
  fail = false; total = 0
  await ctx.state.load()
  assert.equal(ctx.state.error.value, '')
  assert.equal(ctx.state.total.value, 0)
  assert.equal(ctx.state.totalPages.value, 1)
  ctx.dispose()
})
test('search invalidates in-flight data before the debounce fires', async () => {
  let resolve
  const ctx = setup((_, params) => new Promise(done => { resolve = () => done(result(params)) }))
  ctx.state.search.value = 'new query'
  resolve()
  await flush()
  assert.equal(ctx.state.items.value.length, 0)
  ctx.dispose()
})
test('single-page helper clamps pagination and rejects invalid envelopes', async () => {
  let calls = 0
  await pagination.fetchPage(async (_, params) => {
    calls++
    assert.equal(params.limit, 200)
    assert.equal(params.offset, 0)
    return result(params)
  }, '/users/', { limit: 500, offset: -1 })
  assert.equal(calls, 1)
  await assert.rejects(pagination.fetchPage(async () => [], '/users/'), /Invalid paginated response/)
})

test('adopts a server-limited page size before computing further offsets', async () => {
  const calls = []
  const ctx = setup(async (_, params) => {
    calls.push(params)
    return { ...result(params, 30), limit: 10 }
  })
  await flush()
  assert.equal(ctx.state.pageSize.value, 10)
  assert.equal(calls.at(-1).limit, 10)
  ctx.state.page.value = 2
  await flush()
  assert.equal(calls.at(-1).offset, 10)
  ctx.dispose()
})
