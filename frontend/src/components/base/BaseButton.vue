<template>
  <v-btn
    v-bind="$attrs"
    :variant="resolvedVariant"
    :color="resolvedColor"
    :size="resolvedSize"
    :icon="iconOnly"
    :block="block"
    :loading="loading"
    :disabled="disabled || loading"
    class="base-btn"
    :class="{
      'base-btn--icon': iconOnly,
      'base-btn--full': block,
    }"
  >
    <template v-if="$slots.prepend" #prepend>
      <slot name="prepend" />
    </template>
    <slot />
    <template v-if="$slots.append" #append>
      <slot name="append" />
    </template>
  </v-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    color?: string;
    variant?: 'flat' | 'outlined' | 'text' | 'tonal';
    tone?: 'primary' | 'secondary' | 'neutral';
    size?: 'sm' | 'md' | 'lg';
    block?: boolean;
    iconOnly?: boolean;
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    color: undefined,
    variant: 'flat',
    tone: 'primary',
    size: 'md',
    block: false,
    iconOnly: false,
    loading: false,
    disabled: false,
  }
);

const resolvedColor = computed(() => {
  if (props.color) return props.color;
  if (props.tone === 'secondary') return 'secondary';
  if (props.tone === 'neutral') return 'surface-variant';
  return 'primary';
});
const resolvedVariant = computed(() => props.variant);
const resolvedSize = computed(() => {
  if (props.size === 'sm') return 'small';
  if (props.size === 'lg') return 'large';
  return 'default';
});
</script>

<style scoped>
.base-btn {
  min-width: 120px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.base-btn--full {
  width: 100%;
}

.base-btn--icon {
  min-width: auto;
  width: 40px;
  height: 40px;
  padding: 0;
}

.base-btn:focus-visible {
  outline: 2px solid var(--ui-green);
  outline-offset: 2px;
}
</style>
