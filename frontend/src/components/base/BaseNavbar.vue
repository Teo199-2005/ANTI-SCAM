<template>
  <v-app-bar height="68" flat class="app-navbar px-2">
    <v-btn icon="mdi-menu" variant="text" @click="$emit('toggleDrawer')" />
    <v-app-bar-title class="font-weight-bold text-no-wrap">{{ brand.appName }}</v-app-bar-title>
    <template v-if="auth.isAuthenticated">
      <v-btn icon="mdi-bell-outline" variant="text" size="small" class="mr-1" />
      <v-chip size="small" color="secondary" class="mr-2 text-uppercase" variant="flat">{{ auth.role }}</v-chip>
      <v-btn variant="text" color="primary" @click="logout">Logout</v-btn>
    </template>
    <template v-else>
      <v-btn to="/auth/login" variant="text">Login</v-btn>
      <v-btn to="/auth/register" color="primary" variant="flat">Register</v-btn>
    </template>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { brand } from '../../constants/brand';
import { useAuthStore } from '../../store/useAuthStore';
import client from '../../services/http/client';

defineEmits<{ toggleDrawer: [] }>();
const auth = useAuthStore();
const router = useRouter();

const logout = async () => {
  try {
    await client.post('/auth/logout');
  } catch {
    // no-op: local logout still enforced
  }
  auth.logoutLocal();
  router.push('/auth/login');
};
</script>

<style scoped>
.app-navbar {
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-white);
  box-shadow: var(--ui-shadow-card);
}
</style>
