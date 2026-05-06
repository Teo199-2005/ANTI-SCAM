<template>
  <v-dialog :model-value="modelValue" max-width="680" @update:model-value="$emit('update:modelValue', $event)">
    <v-card class="base-modal">
      <div class="base-modal__header pa-4 pa-md-5">
        <div class="text-subtitle-1 font-weight-bold">{{ title }}</div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('update:modelValue', false)" />
      </div>
      <v-divider />
      <div class="pa-5 pa-md-6">
        <slot />
      </div>
      <v-divider v-if="$slots.actions" />
      <div v-if="$slots.actions" class="pa-4 pa-md-5 d-flex justify-end ga-2">
        <slot name="actions" />
      </div>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
  }>(),
  {
    title: 'Dialog',
  }
);
defineEmits<{ 'update:modelValue': [boolean] }>();
</script>
<style scoped>
.base-modal {
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  box-shadow: var(--ui-shadow-hover);
}

.base-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
