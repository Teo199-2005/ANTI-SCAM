<template>
  <v-snackbar v-model="show" :color="color" location="top right" timeout="2800" class="base-toast">
    <div class="d-flex align-center ga-2">
      <v-icon size="18">{{ icon }}</v-icon>
      <span>{{ message }}</span>
    </div>
    <template #actions>
      <v-btn variant="text" size="small" @click="show = false">Dismiss</v-btn>
    </template>
  </v-snackbar>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useNotifications } from '../../composables/useNotifications';
const { state } = useNotifications();
const show = computed({ get: () => state.value.open, set: (value) => (state.value.open = value) });
const message = computed(() => state.value.message);
const color = computed(() => state.value.color);
const icon = computed(() => {
  if (color.value === 'error') return 'mdi-alert-circle-outline';
  if (color.value === 'warning') return 'mdi-alert-outline';
  if (color.value === 'info') return 'mdi-information-outline';
  return 'mdi-check-circle-outline';
});
</script>
<style scoped>
.base-toast :deep(.v-snackbar__wrapper) {
  border-radius: var(--ui-radius-sm);
  border: 1px solid var(--ui-border);
}
</style>
