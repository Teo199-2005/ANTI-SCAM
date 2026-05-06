<template>
  <v-app>
    <v-main class="auth-bg">
      <v-container class="auth-container py-10">
        <v-row justify="center" align="stretch" class="ga-0">
          <v-col cols="12" md="6" class="d-none d-md-flex">
            <v-sheet class="pa-10 auth-side-panel" rounded="xl" width="100%">
              <div class="text-overline text-primary mb-2">Anti-Scam PH</div>
              <h2 class="text-h4 font-weight-bold mb-3">Modern reservations, clean operations, better guest experience.</h2>
              <p class="text-body-1 text-medium-emphasis mb-6">
                Role-based dashboards, tenant-isolated data, and optimized booking workflows — built for growing resorts.
              </p>
              <v-list density="comfortable" class="auth-side-list">
                <v-list-item prepend-icon="mdi-shield-check-outline" title="Strict tenant separation and security" />
                <v-list-item prepend-icon="mdi-calendar-check-outline" title="Anti-double-booking reservation engine" />
                <v-list-item prepend-icon="mdi-chart-line" title="Clear dashboard analytics and operations" />
              </v-list>
            </v-sheet>
          </v-col>
          <v-col cols="12" sm="10" md="5" lg="4">
            <v-sheet class="pa-6 pa-md-8 auth-form-panel card-shadow" rounded="xl" width="100%">
              <div class="text-center mb-5">
                <div class="text-h5 font-weight-bold">Welcome Back</div>
                <div class="text-body-2 text-medium-emphasis">Sign in or create your account to continue.</div>
              </div>
              <slot><RouterView /></slot>
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-bg {
  background: var(--ui-bg-alt);
  min-height: 100%;
}

.auth-container {
  max-width: 1180px;
}

.auth-side-panel,
.auth-form-panel {
  border: 1px solid var(--ui-border);
  background: var(--ui-white);
}

.auth-side-panel {
  box-shadow: var(--ui-shadow-card);
}

.auth-side-list {
  background: transparent;
}
</style>
