<template>
  <v-footer class="base-footer">
    <div class="footer-shell px-6 py-5">
      <div class="footer-grid">
        <div>
          <div class="text-subtitle-1 font-weight-bold mb-1">Anti-Scam PH</div>
          <div class="text-body-2 text-medium-emphasis">Modern reservation operations for multi-tenant resorts.</div>
        </div>
        <!-- Recommended legal disclaimer: shown in footer and onboarding pages -->
        <div class="text-xs text-medium-emphasis" style="line-height:1.3">
          Anti-ScamPH is an independent verification and booking facilitation platform. All hospitality establishments remain independently owned and operated. Anti-ScamPH does not manage, control, or participate in the operations, pricing, taxes, permits, or profits of listed establishments. Verification status only confirms that the establishment underwent the platform’s verification process at the time of approval.
        </div>
        <div class="d-flex ga-4 flex-wrap justify-end align-center">
          <router-link to="/public/resorts" class="text-body-2">Browse Resorts</router-link>
          <router-link to="/auth/login" class="text-body-2">Login</router-link>
          <router-link to="/auth/register" class="text-body-2">Register</router-link>
        </div>
      </div>
    </div>
  </v-footer>
</template>

<style scoped>
.base-footer {
  border-top: 1px solid var(--ui-border);
  background: var(--ui-white);
}

.footer-shell {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: var(--ui-space-2);
  align-items: center;
}

@media (max-width: 960px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
