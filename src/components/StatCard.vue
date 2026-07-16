<template>
  <v-card class="stat-card pa-5" rounded="xl" :style="cardStyle" elevation="0">
    <div class="d-flex align-center justify-space-between">
      <div>
        <p class="stat-label">{{ label.toUpperCase() }}</p>
        <p class="stat-value" :style="{ color: colors.value }">{{ formattedValue }}</p>
        <p v-if="subtext" class="stat-sub" :style="{ color: colors.sub }">{{ subtext }}</p>
      </div>
      <div class="stat-icon-box" :style="{ background: colors.iconBg }">
        <v-icon :color="colors.icon" size="24">{{ icon }}</v-icon>
      </div>
    </div>
  </v-card>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: number | string
  icon: string
  color?: string
  subtext?: string
}>()

const palette: Record<string, {
  bg: string; value: string; sub: string; icon: string; iconBg: string
}> = {
  primary: {
    bg:     '#EEE7F7',
    value:  '#15091F',
    sub:    'rgba(21, 9, 31, 0.6)',
    icon:   '#6F2DBD',
    iconBg: 'rgba(111, 45, 189, 0.16)',
  },
  gold: {
    bg:     '#F9E8F1',
    value:  '#15091F',
    sub:    'rgba(21,9,31,0.55)',
    icon:   '#C81D6D',
    iconBg: 'rgba(200,29,109,0.12)',
  },
  success: {
    bg:     'rgba(46,125,50,0.07)',
    value:  '#1B5E20',
    sub:    '#555',
    icon:   '#2E7D32',
    iconBg: 'rgba(46,125,50,0.12)',
  },
  warning: {
    bg:     'rgba(183,121,31,0.1)',
    value:  '#7A4F00',
    sub:    '#777',
    icon:   '#B7791F',
    iconBg: 'rgba(183,121,31,0.18)',
  },
  error: {
    bg:     'rgba(198,40,40,0.07)',
    value:  '#7F1419',
    sub:    '#777',
    icon:   '#C62828',
    iconBg: 'rgba(198,40,40,0.12)',
  },
  info: {
    bg:     'rgba(21,101,192,0.07)',
    value:  '#0D47A1',
    sub:    '#555',
    icon:   '#1565C0',
    iconBg: 'rgba(21,101,192,0.12)',
  },
}

const colors = computed(() => palette[props.color || 'success'])

const cardStyle = computed(() => ({ background: colors.value.bg }))

const formattedValue = computed(() =>
  typeof props.value === 'number' ? props.value.toLocaleString() : props.value
)
</script>

<style scoped>
.stat-card {
  border-radius: 16px !important;
  transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
  border: none !important;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.stat-card:hover { transform: translateY(-3px); }
.stat-card :deep(.v-card__underlay) { display: none; }

.stat-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 6px;
  opacity: 0.65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-value {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.1;
  margin-bottom: 4px;
}
.stat-sub {
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.3;
}
.stat-icon-box {
  width: 50px; height: 50px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
@media (max-width: 600px) {
  .stat-value    { font-size: 26px; }
  .stat-icon-box { width: 42px; height: 42px; border-radius: 12px; }
}
</style>
