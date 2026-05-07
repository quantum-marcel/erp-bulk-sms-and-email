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

// Newgas brand-aligned palette map
const palette: Record<string, {
  bg: string; value: string; sub: string; icon: string; iconBg: string
}> = {
  primary: {
    bg:     '#D32129',
    value:  '#FFFFFF',
    sub:    'rgba(255,255,255,0.65)',
    icon:   '#FFDC00',
    iconBg: 'rgba(255,220,0,0.15)',
  },
  gold: {
    bg:     '#FFDC00',
    value:  '#1C0A0A',
    sub:    'rgba(28,10,10,0.55)',
    icon:   '#D32129',
    iconBg: 'rgba(211,33,41,0.12)',
  },
  success: {
    bg:     'rgba(46,125,50,0.07)',
    value:  '#1B5E20',
    sub:    '#555',
    icon:   '#2E7D32',
    iconBg: 'rgba(46,125,50,0.12)',
  },
  warning: {
    bg:     'rgba(255,220,0,0.1)',
    value:  '#7A5F00',
    sub:    '#777',
    icon:   '#998400',
    iconBg: 'rgba(255,220,0,0.2)',
  },
  error: {
    bg:     'rgba(211,33,41,0.07)',
    value:  '#7F1419',
    sub:    '#777',
    icon:   '#D32129',
    iconBg: 'rgba(211,33,41,0.12)',
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
  letter-spacing: -0.5px;
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