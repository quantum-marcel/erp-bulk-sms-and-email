<template>
  <v-app>

    <NavBar @logout="handleLogout" />

    <!-- Top bar -->
    <v-app-bar elevation="0" height="60" class="ng-topbar">
      <v-btn icon variant="text" size="small" class="ml-2 mr-1" @click="uiStore.toggleDrawer()">
        <v-icon size="20" color="#1C0A0A">mdi-menu</v-icon>
      </v-btn>
      <div class="ng-topbar__page d-flex align-center">
        <div class="ng-topbar__indicator" />
        <div>
          <p class="ng-topbar__title">{{ pageTitle }}</p>
          <p class="ng-topbar__sub">{{ pageSub }}</p>
        </div>
      </div>
      <v-spacer />
      <div class="d-flex align-center ga-1 mr-3">
        <div class="ng-topbar__search d-none d-lg-flex">
          <v-icon size="16" color="rgba(0,0,0,0.35)" class="mr-2">mdi-magnify</v-icon>
          <input class="ng-topbar__search-input" placeholder="Search campaigns..." />
        </div>
        <v-btn to="/compose" size="small" rounded="xl" elevation="0" class="ng-topbar__compose-btn d-none d-sm-flex mr-1">
          <v-icon size="15" class="mr-1">mdi-plus</v-icon> New Campaign
        </v-btn>
        <div class="ng-topbar__divider" />
        <v-menu location="bottom end" offset="10">
          <template #activator="{ props }">
            <div v-bind="props" class="ng-topbar__user-chip">
              <v-avatar size="30" class="ng-topbar__avatar mr-2">
                <span class="text-caption font-weight-bold text-white">{{ authStore.userInitials }}</span>
              </v-avatar>
              <div class="d-none d-sm-block">
                <p class="ng-topbar__uname">{{ authStore.user?.fullName || 'User' }}</p>
                <p class="ng-topbar__urole">{{ authStore.user?.role === 'admin' ? 'Admin' : 'Staff' }}</p>
              </div>
              <v-icon size="12" color="rgba(0,0,0,0.3)" class="ml-1 d-none d-sm-block">mdi-chevron-down</v-icon>
            </div>
          </template>
          <v-card min-width="210" rounded="xl" elevation="8" class="ng-user-menu">
            <div class="ng-user-menu__header">
              <v-avatar size="40" class="ng-topbar__avatar mr-3">
                <span class="font-weight-bold text-white" style="font-size:14px">{{ authStore.userInitials }}</span>
              </v-avatar>
              <div>
                <p style="font-size:13.5px;font-weight:600;color:#1C0A0A;line-height:1.2">{{ authStore.user?.fullName }}</p>
                <p style="font-size:11px;color:rgba(0,0,0,0.38)">{{ authStore.user?.email }}</p>
              </div>
            </div>
            <v-divider />
            <v-list density="compact" nav class="py-2">
              <v-list-item prepend-icon="mdi-logout" title="Sign Out" rounded="lg" class="text-error text-body-2" @click="handleLogout" />
            </v-list>
          </v-card>
        </v-menu>
      </div>
    </v-app-bar>

    <!-- Main content -->
    <v-main class="ng-main">
      <!-- pa-4 on mobile (sm and down), pa-8 on desktop (md+) — no media queries needed -->
      <v-container fluid :class="['ng-content', display.mdAndUp.value ? 'pa-8' : 'pa-4']">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </v-container>
    </v-main>

    <!-- Toasts -->
    <div class="ng-toast-stack">
      <transition-group name="toast">
        <v-alert
          v-for="t in uiStore.toasts"
          :key="t.id"
          :type="t.type"
          density="compact"
          rounded="xl"
          closable
          class="ng-toast"
          elevation="6"
          @click:close="uiStore.dismissToast(t.id)"
        >{{ t.message }}</v-alert>
      </transition-group>
    </div>

  </v-app>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore }   from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import NavBar from '@/components/NavBar.vue'

const display = useDisplay()

const uiStore   = useUiStore()
const authStore = useAuthStore()
const route     = useRoute()
const router    = useRouter()

const pageMap: Record<string, { title: string; sub: string }> = {
  '/dashboard':     { title: 'Dashboard',     sub: 'Overview of your campaigns'       },
  '/compose':       { title: 'New Campaign',  sub: 'Create a bulk messaging campaign' },
  '/campaigns':     { title: 'Campaigns',     sub: 'All campaigns & drafts'           },
  '/mailing-lists': { title: 'Mailing Lists', sub: 'Manage recipient domains'         },
}

const current = computed(() => {
  const k = Object.keys(pageMap).find(p => route.path === p || (p !== '/' && route.path.startsWith(p + '/')))
  return k ? pageMap[k] : { title: 'Newgas SMS', sub: '' }
})
const pageTitle = computed(() => current.value.title)
const pageSub   = computed(() => current.value.sub)

function handleLogout() {
  authStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.ng-topbar { background: #FFFFFF !important; border-bottom: 1px solid #EDE0E0 !important; }
.ng-topbar__page { gap: 0; }
.ng-topbar__indicator { width: 3px; height: 26px; background: #D32129; border-radius: 3px; margin-right: 12px; flex-shrink: 0; }
.ng-topbar__title { font-size: 14.5px; font-weight: 700; color: #1C0A0A; line-height: 1.2; }
.ng-topbar__sub   { font-size: 11px; color: rgba(0,0,0,0.38); line-height: 1.3; }
.ng-topbar__search { align-items: center; background: #F3EDED; border: 1px solid #EDE0E0; border-radius: 8px; padding: 6px 12px; margin-right: 8px; min-width: 200px; transition: border-color 0.2s; }
.ng-topbar__search:focus-within { border-color: #D32129; }
.ng-topbar__search-input { border: none; outline: none; background: transparent; font-size: 13px; color: #1C0A0A; font-family: 'DM Sans', sans-serif; width: 100%; }
.ng-topbar__search-input::placeholder { color: rgba(0,0,0,0.35); }
.ng-topbar__compose-btn { background: #D32129 !important; color: #fff !important; font-size: 12.5px !important; font-weight: 600 !important; text-transform: none !important; height: 32px !important; }
.ng-topbar__compose-btn:hover { background: #A91A21 !important; }
.ng-topbar__divider { width: 1px; height: 24px; background: #EDE0E0; margin: 0 8px; flex-shrink: 0; }
.ng-topbar__user-chip { display: flex; align-items: center; padding: 3px 10px 3px 4px; border-radius: 40px; border: 1px solid #EDE0E0; cursor: pointer; transition: all 0.18s; user-select: none; }
.ng-topbar__user-chip:hover { background: #FDF0F0; border-color: #D32129; }
.ng-topbar__avatar { background: #D32129 !important; }
.ng-topbar__uname  { font-size: 12px; font-weight: 600; color: #1C0A0A; line-height: 1.2; }
.ng-topbar__urole  { font-size: 10px; color: rgba(0,0,0,0.38); line-height: 1.3; }
.ng-user-menu { border: 1px solid #EDE0E0 !important; }
.ng-user-menu__header { display: flex; align-items: center; padding: 14px 16px; }
.ng-main { background: rgb(var(--v-theme-background)) !important; min-height: 100vh; }
.ng-content { padding: 28px 32px; max-width: 1440px; }
.ng-toast-stack {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 280px;
  max-width: 400px;
}
@media (max-width: 600px) {
  .ng-toast-stack {
    left: 12px;
    right: 12px;
    bottom: 16px;
    min-width: unset;
    max-width: unset;
  }
  .ng-content {
    padding: 16px !important;
  }
}
.ng-toast { box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(50px); }
.toast-leave-to   { opacity: 0; transform: translateX(50px); }
.page-enter-active, .page-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.page-enter-from  { opacity: 0; transform: translateY(8px); }
.page-leave-to    { opacity: 0; transform: translateY(-4px); }
</style>
