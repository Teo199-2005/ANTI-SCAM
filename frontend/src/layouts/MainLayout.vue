<template>
  <v-app>
    <BaseNavbar @toggle-drawer="drawer = !drawer" />
    <v-navigation-drawer
      v-model="drawer"
      class="app-drawer"
      :rail="rail && !display.smAndDown.value"
      :permanent="!display.smAndDown.value"
      :temporary="display.smAndDown.value"
      :width="260"
      :rail-width="74"
    >
      <div class="drawer-brand px-3 py-4">
        <div v-if="!rail || display.smAndDown.value">
          <div class="text-subtitle-1 font-weight-bold text-primary">Anti-Scam PH</div>
          <div class="text-caption text-medium-emphasis">Dashboard System</div>
        </div>
        <v-btn
          v-if="!display.smAndDown.value"
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          size="small"
          variant="text"
          @click="rail = !rail"
        />
      </div>
      <v-divider />

      <v-list density="comfortable" nav class="py-2">
        <v-list-item
          v-for="item in publicLinks"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          rounded="lg"
          class="drawer-link"
          :active="route.path === item.to"
        />
      </v-list>
      <v-divider class="my-2" />
      <div v-if="!rail || display.smAndDown.value" class="px-4 text-caption text-medium-emphasis">Management</div>
      <v-list density="comfortable" nav class="py-2">
        <v-list-item
          v-for="item in secureLinks"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          rounded="lg"
          class="drawer-link"
          :active="route.path.startsWith(item.to)"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main class="app-main">
      <div class="page-shell layout-page-shell">
        <slot><RouterView /></slot>
      </div>
    </v-main>
    <BaseFooter />
  </v-app>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import BaseFooter from '../components/base/BaseFooter.vue';
import BaseNavbar from '../components/base/BaseNavbar.vue';
import { useAuthStore } from '../store/useAuthStore';

const drawer = ref(true);
const rail = ref(false);
const display = useDisplay();
const auth = useAuthStore();
const route = useRoute();

const links = [
  { title: 'Home', to: '/', icon: 'mdi-home-outline' },
  { title: 'Browse Resorts', to: '/public/resorts', icon: 'mdi-domain' },
  { title: 'Dashboard', to: '/dashboard', icon: 'mdi-view-dashboard-outline' },
  { title: 'Resort Panel', to: '/resort', icon: 'mdi-office-building-outline' },
  { title: 'Rooms', to: '/resort/rooms', icon: 'mdi-bed-outline' },
  { title: 'Users', to: '/users', icon: 'mdi-account-group-outline' },
  { title: 'Admin Control', to: '/admin', icon: 'mdi-shield-account-outline' },
  { title: 'Marketing', to: '/marketing', icon: 'mdi-chart-line' },
  { title: 'Staff', to: '/staff', icon: 'mdi-clipboard-account-outline' },
  { title: 'Client', to: '/client', icon: 'mdi-account-circle-outline' },
];

const visibleLinks = computed(() =>
  links.filter((link) => {
    if (!auth.isAuthenticated && link.to !== '/' && link.to !== '/public/resorts') return false;
    if (link.to === '/admin') return auth.role === 'admin';
    if (link.to === '/users') return ['admin', 'admin_staff', 'resort_owner'].includes(auth.role);
    if (link.to === '/resort' || link.to === '/resort/rooms') return ['admin', 'resort_owner'].includes(auth.role);
    if (link.to === '/staff') return ['admin', 'admin_staff'].includes(auth.role);
    if (link.to === '/marketing') return ['admin', 'marketing'].includes(auth.role);
    if (link.to === '/client') return ['admin', 'client', 'user'].includes(auth.role);
    if (link.to === '/dashboard') return auth.isAuthenticated;
    return true;
  })
);

const publicLinks = computed(() => visibleLinks.value.filter((item) => item.to === '/' || item.to === '/public/resorts'));
const secureLinks = computed(() => visibleLinks.value.filter((item) => item.to !== '/' && item.to !== '/public/resorts'));
</script>

<style scoped>
.app-drawer {
  border-right: 1px solid var(--ui-border);
  background: var(--ui-white);
}

.drawer-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
}

.drawer-link {
  margin: 2px 8px;
  border-left: 3px solid transparent;
  border-radius: var(--ui-radius-sm);
}

.drawer-link.v-list-item--active {
  border-left-color: var(--ui-orange);
  background: #fff8f1;
  color: var(--ui-orange-dark);
}

.app-main {
  background: var(--ui-bg-alt);
}

.layout-page-shell {
  padding-top: var(--ui-space-2);
  padding-bottom: var(--ui-space-4);
}
</style>
