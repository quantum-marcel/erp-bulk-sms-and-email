import type { FilterRule, RuleGroup_Input } from '@/types/backend'
import type { PartnerField } from '@/types/sms'
export type RuleNode = FilterRule | RuleGroup_Input
export function isRuleGroup(rule: RuleNode): rule is RuleGroup_Input { return 'rules' in rule }
export const ruleOperators = {
  eq: 'is equal to', neq: 'is not equal to', gt: 'is greater than', gte: 'is at least',
  lt: 'is less than', lte: 'is at most', like: 'contains (case-sensitive)', ilike: 'contains',
  in: 'is one of', not_in: 'is not one of', is_null: 'is empty', is_not_null: 'is not empty',
}
export function emptyRule(): FilterRule { return { field: '', op: 'eq', value: '' } }
export function countRules(rules: RuleNode[]): number { return rules.reduce((n, rule) => n + (isRuleGroup(rule) ? countRules(rule.rules) : 1), 0) }
export function ruleSummary(rule: RuleNode, label: (name: string) => string): string {
  if (isRuleGroup(rule)) return `${rule.negate ? 'NOT ' : ''}(${rule.rules.map(child => ruleSummary(child, label)).join(` ${rule.match || 'AND'} `)})`
  return `${label(rule.field)} ${ruleOperators[rule.op]}${rule.op === 'is_null' || rule.op === 'is_not_null' ? '' : ' ' + (typeof rule.value === 'object' ? JSON.stringify(rule.value) : String(rule.value ?? ''))}`
}
// Return only schema fields; preserve existing typed values and nested groups.
export function prepareRules(rules: RuleNode[], fields: PartnerField[], nested = false): RuleNode[] {
  if (nested && !rules.length) throw new Error('Each group needs at least one condition.')
  return rules.map(rule => {
    if (isRuleGroup(rule)) return { match: rule.match || 'AND', negate: rule.negate || false, rules: prepareRules(rule.rules, fields, true) }
    if (!rule.field.trim()) throw new Error('Choose a field for every condition.')
    if (!(rule.op in ruleOperators)) throw new Error('Choose a valid operator.')
    if (rule.op === 'is_null' || rule.op === 'is_not_null') return { field: rule.field, op: rule.op }
    let value = rule.value
    const type = fields.find(field => field.name === rule.field)?.ttype
    if (rule.op === 'in' || rule.op === 'not_in') {
      if (typeof value === 'string') {
        try { value = JSON.parse(value) } catch { throw new Error('Enter a JSON array for “is one of”, e.g. ["Marcel", "Zeus"].') }
      }
      if (!Array.isArray(value) || !value.length) throw new Error('Enter at least one value in the array.')
    } else if (typeof value === 'string' && ['integer', 'float', 'monetary'].includes(type || '')) {
      if (!value.trim() || !Number.isFinite(Number(value))) throw new Error(`Enter a number for ${rule.field}.`)
      value = Number(value)
      if (type === 'integer' && !Number.isInteger(value)) throw new Error(`Enter a whole number for ${rule.field}.`)
    } else if (typeof value === 'string' && type === 'boolean') {
      if (!['true', 'false'].includes(value)) throw new Error(`Choose true or false for ${rule.field}.`)
      value = value === 'true'
    }
    return { field: rule.field, op: rule.op, value }
  })
}
