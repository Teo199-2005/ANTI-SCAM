<template>
  <v-app>
    <v-app-bar height="68" flat class="public-navbar">
      <div class="public-navbar-inner d-flex align-center justify-space-between w-100 px-6">
        <RouterLink to="/" class="public-brand text-decoration-none">
          <span class="font-weight-bold text-primary">Resort</span><span class="font-weight-bold">Staycation SaaS</span>
        </RouterLink>
        <div class="d-none d-md-flex align-center ga-2">
          <v-btn variant="text" to="/" size="small">Home</v-btn>
          <v-btn variant="text" to="/public/resorts" size="small">Browse Resorts</v-btn>
          <template v-if="auth.isAuthenticated">
            <v-chip size="small" color="secondary" variant="flat">{{ auth.role }}</v-chip>
            <v-btn color="primary" size="small" to="/dashboard">Dashboard</v-btn>
          </template>
          <template v-else>
            <v-btn variant="text" to="/auth/login" size="small">Login</v-btn>
            <v-btn color="primary" size="small" to="/auth/register">Get Started</v-btn>
          </template>
        </div>
        <v-btn class="d-flex d-md-none" icon="mdi-menu" variant="text" @click="mobileMenu = !mobileMenu" />
      </div>
    </v-app-bar>

    <v-navigation-drawer v-model="mobileMenu" location="right" temporary class="d-md-none">
      <v-list nav>
        <v-list-item to="/" prepend-icon="mdi-home-outline" title="Home" />
        <v-list-item to="/public/resorts" prepend-icon="mdi-domain" title="Browse Resorts" />
        <v-list-item v-if="!auth.isAuthenticated" to="/auth/login" prepend-icon="mdi-login" title="Login" />
        <v-list-item v-if="!auth.isAuthenticated" to="/auth/register" prepend-icon="mdi-account-plus-outline" title="Get Started" />
        <v-list-item v-if="auth.isAuthenticated" to="/dashboard" prepend-icon="mdi-view-dashboard-outline" title="Dashboard" />
      </v-list>
    </v-navigation-drawer>

    <v-main class="public-main">
      <div class="public-shell">
        <slot><RouterView /></slot>
      </div>
    </v-main>
    <BaseFooter />
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BaseFooter from '../components/base/BaseFooter.vue';
import { useAuthStore } from '../store/useAuthStore';

const auth = useAuthStore();
const mobileMenu = ref(false);
</script>

<style scoped>
.public-navbar {
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-white);
  box-shadow: var(--ui-shadow-card);
}

.public-navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.public-brand {
  color: var(--ui-text);
  font-size: 1.1rem;
  letter-spacing: -0.02em;
}

.public-main {
  background: var(--ui-bg-alt);
}

.public-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
