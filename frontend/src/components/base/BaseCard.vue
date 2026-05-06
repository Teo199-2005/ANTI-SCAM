<template>
  <v-card class="base-card" :class="{ 'base-card--hoverable': hoverable }">
    <div v-if="$slots.header" class="base-card__header">
      <slot name="header" />
    </div>
    <div :class="padded ? 'pa-4 pa-md-5' : ''">
      <slot />
    </div>
  </v-card>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    hoverable?: boolean;
    padded?: boolean;
  }>(),
  {
    hoverable: false,
    padded: true,
  }
);
</script>

<style scoped>
.base-card {
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-white);
  box-shadow: var(--ui-shadow-card);
}

.base-card__header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--ui-border);
}

.base-card--hoverable {
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.base-card--hoverable:hover {
  box-shadow: var(--ui-shadow-hover);
  transform: translateY(-1px);
}
</style>
