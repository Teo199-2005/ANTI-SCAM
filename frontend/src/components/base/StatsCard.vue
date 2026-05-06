<template>
  <BaseCard class="stats-card" :hoverable="true">
    <div class="stats-card__accent" :class="accentClass" />
    <div class="d-flex align-center justify-space-between ga-3">
      <div class="stats-card__content">
        <div class="stats-card__label">{{ label }}</div>
        <div class="stats-card__value">{{ value }}</div>
        <div v-if="trend" class="stats-card__trend" :class="trend.startsWith('-') ? 'text-error' : 'text-secondary'">
          {{ trend }}
        </div>
      </div>
      <div v-if="icon" class="stats-card__icon-wrap">
        <v-icon size="20" :color="tone === 'success' ? 'secondary' : 'primary'">{{ icon }}</v-icon>
      </div>
    </div>
  </BaseCard>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from './BaseCard.vue';

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    icon?: string;
    trend?: string;
    tone?: 'primary' | 'success';
  }>(),
  {
    icon: undefined,
    trend: '',
    tone: 'primary',
  }
);

const accentClass = computed(() => (props.tone === 'success' ? 'stats-card__accent--success' : 'stats-card__accent--primary'));
</script>

<style scoped>
.stats-card {
  position: relative;
  overflow: hidden;
}

.stats-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

.stats-card__accent--primary {
  background: var(--ui-orange);
}

.stats-card__accent--success {
  background: var(--ui-green);
}

.stats-card__label {
  color: var(--ui-text-muted);
  font-size: var(--ui-font-sm);
  font-weight: 600;
}

.stats-card__value {
  margin-top: 4px;
  color: var(--ui-black);
  font-size: var(--ui-font-h3);
  font-weight: 800;
  line-height: 1.2;
}

.stats-card__trend {
  margin-top: 6px;
  font-size: var(--ui-font-xs);
  font-weight: 700;
}

.stats-card__icon-wrap {
  width: 36px;
  height: 36px;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
