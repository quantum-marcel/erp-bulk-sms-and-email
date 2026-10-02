const fs = require('node:fs')
const spec = JSON.parse(fs.readFileSync('docs/backend-openapi.json', 'utf8'))
const identifier = name => name.replace(/[^a-zA-Z0-9_$]/g, '_')
const names = Object.keys(spec.components.schemas).map(identifier)
if (new Set(names).size !== names.length) throw Error('Schema names collide after normalization')
function type(s) {
  if (s.$ref) return identifier(s.$ref.split('/').pop())
  if (s.enum) return s.enum.map(x => JSON.stringify(x)).join(' | ')
  if (s.anyOf) return s.anyOf.map(type).join(' | ')
  if (s.allOf) return s.allOf.map(type).join(' & ')
  if (s.type === 'array') return `(${type(s.items || {})})[]`
  if (s.type === 'object') {
    if (!s.properties) return `Record<string, ${s.additionalProperties && typeof s.additionalProperties === 'object' ? type(s.additionalProperties) : 'unknown'}>`
    return `{\n${Object.entries(s.properties).map(([k,v]) => `  ${k}${(s.required || []).includes(k) ? '' : '?'}: ${type(v)}`).join('\n')}\n}`
  }
  return ({ integer: 'number', number: 'number', string: 'string', boolean: 'boolean', null: 'null' })[s.type] || 'unknown'
}
const output = '// Generated from docs/backend-openapi.json. Run npm run api:generate.\n' + Object.entries(spec.components.schemas).map(([name,s]) => `export type ${identifier(name)} = ${type(s)}\n`).join('\n')
if (process.argv.includes('--check')) {
  if (fs.readFileSync('src/types/backend.ts', 'utf8') !== output) throw Error('Backend types are stale. Run npm run api:generate.')
} else fs.writeFileSync('src/types/backend.ts', output)
