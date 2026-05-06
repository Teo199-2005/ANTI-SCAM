<template>
  <v-card class="table-shell">
    <v-data-table-server
      :headers="headers"
      :items="items"
      :items-length="totalItems"
      :loading="loading"
      item-value="id"
      class="base-table"
    >
      <template #no-data>
        <div class="empty-state my-4">
          <v-icon size="20" class="mb-2">mdi-database-search-outline</v-icon>
          <div>No records found.</div>
        </div>
      </template>
    </v-data-table-server>
  </v-card>
</template>
<script setup lang="ts">
defineProps<{ headers: any[]; items: any[]; totalItems: number; loading?: boolean }>();
</script>
<style scoped>
.table-shell {
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  box-shadow: var(--ui-shadow-card);
  overflow: hidden;
}

.base-table :deep(th) {
  font-weight: 700;
  color: var(--ui-text);
  background: var(--ui-bg-alt);
}

.base-table :deep(tbody tr:nth-child(even)) {
  background: #fcfcfc;
}

.base-table :deep(tbody tr:hover) {
  background: #fffaf5;
}
</style>
