<template>
  <BaseCard class="widget-shell">
    <template v-if="title || $slots.actions" #header>
      <div class="d-flex align-center justify-space-between ga-2">
        <div class="font-weight-bold">{{ title }}</div>
        <div v-if="$slots.actions">
          <slot name="actions" />
        </div>
      </div>
    </template>
    <div class="widget-content">
      <slot />
    </div>
  </BaseCard>
</template>
<script setup lang="ts">
import BaseCard from './BaseCard.vue';

withDefaults(
  defineProps<{
    title?: string;
  }>(),
  {
    title: '',
  }
);
</script>
<style scoped>
.widget-shell {
  border-left: 3px solid var(--ui-orange);
}

.widget-content {
  min-height: 120px;
}
</style>
