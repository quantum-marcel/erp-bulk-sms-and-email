<template>
  <div class="rule-group">
    <div class="d-flex align-center flex-wrap ga-2 mb-3">
      <span class="text-body-2">Match</span>
      <v-select :model-value="logic" :items="[{ title: 'All conditions (AND)', value: 'AND' }, { title: 'Any condition (OR)', value: 'OR' }]" density="compact" variant="outlined" hide-details style="max-width:240px" :disabled="disabled" @update:model-value="emit('update:logic', $event)" />
      <v-btn size="small" variant="text" :disabled="disabled" @click="append(emptyRule())">Add condition</v-btn>
      <v-btn size="small" variant="tonal" :disabled="disabled" @click="append({ match: 'OR', negate: false, rules: [emptyRule()] })">Add group</v-btn>
    </div>
    <p v-if="!modelValue.length" class="text-caption">No conditions — matches all recipients.</p>
    <div v-for="(rule, index) in modelValue" :key="index" class="mb-3">
      <p v-if="index" class="text-caption font-weight-bold mb-2">{{ logic }}</p>
      <v-card v-if="isRuleGroup(rule)" variant="outlined" class="pa-3" rounded="lg">
        <div class="d-flex align-center justify-space-between">
          <v-checkbox :model-value="rule.negate || false" label="Exclude this group (NOT)" density="compact" hide-details :disabled="disabled" @update:model-value="replace(index, { ...rule, negate: !!$event })" />
          <v-btn icon="mdi-close" size="small" variant="text" color="error" aria-label="Remove group" :disabled="disabled" @click="remove(index)" />
        </div>
        <RuleGroupEditor :model-value="rule.rules" :logic="rule.match || 'AND'" :fields="fields" :disabled="disabled" @update:model-value="replace(index, { ...rule, rules: $event })" @update:logic="replace(index, { ...rule, match: $event })" />
      </v-card>
      <div v-else class="d-flex flex-wrap ga-2 align-start">
        <v-autocomplete :model-value="rule.field" :items="fieldItems(rule.field)" label="Field" density="compact" variant="outlined" hide-details style="min-width:170px;flex:1" :disabled="disabled" @update:model-value="replace(index, { ...rule, field: $event || '' })" />
        <v-select :model-value="rule.op" :items="operators" label="Operator" density="compact" variant="outlined" hide-details style="min-width:160px;flex:1" :disabled="disabled" @update:model-value="replace(index, { ...rule, op: $event })" />
        <v-text-field v-if="!['is_null', 'is_not_null'].includes(rule.op)" :model-value="displayValue(rule.value)" label="Value" :hint="['in', 'not_in'].includes(rule.op) ? 'JSON array, e.g. [1, 2]; put text values in double quotes' : undefined" :persistent-hint="['in', 'not_in'].includes(rule.op)" density="compact" variant="outlined" style="min-width:150px;flex:1" :disabled="disabled" @update:model-value="replace(index, { ...rule, value: $event })" />
        <v-btn icon="mdi-close" size="small" variant="text" color="error" aria-label="Remove condition" :disabled="disabled" @click="remove(index)" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { PartnerField } from '@/types/sms'
import { isRuleGroup, emptyRule, ruleOperators, type RuleNode } from '@/utils/domainRules'
const props = defineProps<{ modelValue: RuleNode[]; logic: 'AND' | 'OR'; fields: PartnerField[]; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [RuleNode[]]; 'update:logic': ['AND' | 'OR'] }>()
const operators = Object.entries(ruleOperators).map(([value, title]) => ({ value, title }))
function append(rule: RuleNode) { emit('update:modelValue', [...props.modelValue, rule]) }
function remove(index: number) { emit('update:modelValue', props.modelValue.filter((_, i) => i !== index)) }
function replace(index: number, rule: RuleNode) { emit('update:modelValue', props.modelValue.map((item, i) => i === index ? rule : item)) }
function fieldItems(selected: string) {
  const items = props.fields.filter(field => (field.supported && field.searchable) || field.name === selected).map(field => ({ value: field.name, title: field.label || field.name }))
  if (selected && !items.some(item => item.value === selected)) items.push({ value: selected, title: selected })
  return items
}
function displayValue(value: unknown) { return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value) }
</script>
