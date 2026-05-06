<template>
  <div class="base-input-shell">
    <v-text-field
      v-bind="$attrs"
      :label="label"
      :type="type"
      :model-value="modelValue"
      :error-messages="errorMessages"
      :placeholder="placeholder"
      :hint="hint"
      :counter="counter"
      class="base-input"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <template v-if="$slots.prependInner" #prepend-inner>
        <slot name="prependInner" />
      </template>
      <template v-if="$slots.appendInner" #append-inner>
        <slot name="appendInner" />
      </template>
    </v-text-field>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string | number;
    label: string;
    type?: string;
    placeholder?: string;
    errorMessages?: string | string[];
    hint?: string;
    counter?: number | string;
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: '',
    errorMessages: '',
    hint: '',
    counter: undefined,
  }
);

defineEmits<{ 'update:modelValue': [string | number] }>();
</script>

<style scoped>
.base-input-shell {
  width: 100%;
}

.base-input :deep(.v-field) {
  border-radius: var(--ui-radius-sm);
}

.base-input :deep(.v-field__outline) {
  color: var(--ui-border);
}

.base-input :deep(.v-field--focused .v-field__outline) {
  color: var(--ui-orange);
}
</style>
