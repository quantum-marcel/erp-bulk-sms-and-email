<template>
  <v-navigation-drawer
    v-model="uiStore.drawerOpen"
    :rail="!uiStore.isMobile && uiStore.drawerRail"
    :permanent="!uiStore.isMobile"
    :temporary="uiStore.isMobile"
    :width="264"
    :rail-width="64"
    class="ng-drawer"
  >
    <!-- Logo -->
    <div class="ng-drawer__logo" :class="{ 'ng-drawer__logo--rail': isRail }">
      <div class="ng-drawer__brand-icon">
        <v-img src="/arch-logo-mark.webp" :width="isRail ? 28 : 32" :height="isRail ? 22 : 24" alt="Arch Logo" contain />
      </div>
      <transition name="fade-label">
        <div v-if="!isRail" class="ng-drawer__brand-text">
          <span class="ng-drawer__brand-sub">CAMPAIGN PORTAL</span>
        </div>
      </transition>
    </div>

    <v-divider class="ng-drawer__divider" />

    <!-- User card -->
    <div class="ng-drawer__user" :class="{ 'ng-drawer__user--rail': isRail }">
      <v-avatar size="36" class="ng-drawer__avatar" :class="{ 'mr-3': !isRail }">
        <span class="text-body-2 font-weight-bold text-white">{{ authStore.userInitials }}</span>
      </v-avatar>
      <transition name="fade-label">
        <div v-if="!isRail" class="ng-drawer__user-info">
          <p class="ng-drawer__user-name">{{ authStore.user?.fullName || 'User' }}</p>
          <p class="ng-drawer__user-role">{{ authStore.activeCompany?.name || roleLabel }}</p>
        </div>
      </transition>
    </div>

    <!-- Compose CTA -->
    <div class="ng-drawer__compose-wrap" :class="{ 'ng-drawer__compose-wrap--rail': isRail }">
      <v-btn to="/compose" block elevation="0" rounded="xl" class="ng-drawer__compose-btn">
        <v-icon :size="18" :class="{ 'mr-0': isRail }">mdi-plus</v-icon>
        <transition name="fade-label">
          <span v-if="!isRail" class="ml-2">New Campaign</span>
        </transition>
      </v-btn>
      <v-tooltip v-if="isRail" activator="parent" location="right">New Campaign</v-tooltip>
    </div>

    <v-divider class="ng-drawer__divider" />

    <!-- Nav -->
    <v-list nav density="compact" class="ng-nav px-2 mt-1">
      <template v-for="group in navGroups" :key="group.label">
        <transition name="fade-label">
          <p v-if="!isRail && group.label" class="ng-nav__group-label px-2 mb-1 mt-3">{{ group.label }}</p>
        </transition>
        <v-divider v-if="isRail && group.label" class="ng-drawer__divider my-2" />

        <v-list-item
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          exact-active-class="ng-nav__item--active"
          rounded="lg"
          class="ng-nav__item mb-1"
          :value="item.to"
        >
          <template #prepend>
            <v-icon :size="20" class="ng-nav__icon">{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title class="ng-nav__label">{{ item.label }}</v-list-item-title>
          <template v-if="item.badge && !isRail" #append>
            <span class="ng-nav__badge">{{ item.badge }}</span>
          </template>
          <v-tooltip v-if="isRail" activator="parent" location="right">{{ item.label }}</v-tooltip>
        </v-list-item>
      </template>
    </v-list>

    <template #append>
      <v-divider class="ng-drawer__divider" />
      <v-list nav density="compact" class="px-2 py-2">
        <v-list-item
          rounded="lg"
          class="ng-nav__item ng-nav__item--logout mb-1"
          prepend-icon="mdi-logout"
          @click="emit('logout')"
        >
          <v-list-item-title class="ng-nav__label">Sign Out</v-list-item-title>
          <v-tooltip v-if="isRail" activator="parent" location="right">Sign Out</v-tooltip>
        </v-list-item>
      </v-list>
      <div v-if="!uiStore.isMobile" class="ng-drawer__rail-toggle" @click="uiStore.toggleDrawer()">
        <v-icon size="15" color="rgba(255,255,255,0.3)">{{ isRail ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useCampaignStore } from '@/stores/campaign'

const uiStore       = useUiStore()
const authStore     = useAuthStore()
const campaignStore = useCampaignStore()

const emit = defineEmits<{ logout: [] }>()

const isRail = computed(() => !uiStore.isMobile && uiStore.drawerRail)
const roleLabel = computed(() => authStore.user?.role === 'super_admin' ? 'Super Admin' : 'Admin')

const navGroups = computed(() => [
  {
    label: '',
    items: [
      { to: '/dashboard', icon: 'mdi-view-dashboard-outline', label: 'Dashboard' },
    ],
  },
  {
    label: 'Campaigns',
    items: [
      { to: '/compose',   icon: 'mdi-plus-circle-outline',  label: 'New Campaign' },
      { to: '/campaigns', icon: 'mdi-bullhorn-outline',      label: 'All Campaigns',
        badge: campaignStore.draftCount || undefined },
    ],
  },
  {
    label: 'Contacts',
    items: [
      { to: '/mailing-lists', icon: 'mdi-account-group-outline', label: 'Mailing Lists' },
    ],
  },
  ...(authStore.isSuperAdmin ? [{
    label: 'Administration',
    items: [
      { to: '/companies', icon: 'mdi-domain', label: 'Companies' },
      { to: '/users', icon: 'mdi-account-multiple-outline', label: 'Users' },
      { to: '/assignments', icon: 'mdi-account-switch-outline', label: 'Assignments' },
    ],
  }] : []),
])
</script>

<style scoped>
.ng-drawer { background: #15091F !important; border-right: 1px solid rgba(255,255,255,0.05) !important; }
.ng-drawer__logo { height: 60px; display: flex; align-items: center; padding: 0 16px; gap: 12px; flex-shrink: 0; }
.ng-drawer__logo--rail { justify-content: center; padding: 0; }
.ng-drawer__brand-icon { width: 40px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1.5px solid rgba(221,91,153,0.25); }
.ng-drawer__brand-text { display: flex; flex-direction: column; }
.ng-drawer__brand-sub  { font-size: 11px; font-weight: 700; color: #DD5B99; letter-spacing: 1.6px; line-height: 1.5; }
.ng-drawer__divider    { border-color: rgba(255,255,255,0.06) !important; }
.ng-drawer__user       { display: flex; align-items: center; padding: 12px 14px; margin: 10px 10px 4px; background: rgba(255,255,255,0.06); border-radius: 12px; }
.ng-drawer__user--rail { justify-content: center; padding: 10px; margin: 10px 8px 4px; }
.ng-drawer__avatar     { background: #6F2DBD !important; color: #fff !important; font-weight: 700; flex-shrink: 0; }
.ng-drawer__user-info  { overflow: hidden; }
.ng-drawer__user-name  { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ng-drawer__user-role  { font-size: 10.5px; color: rgba(255,255,255,0.38); line-height: 1.4; }
.ng-drawer__compose-wrap { padding: 10px 10px 8px; }
.ng-drawer__compose-wrap--rail { padding: 10px 8px 8px; }
.ng-drawer__compose-btn { background: #6F2DBD !important; color: #fff !important; font-weight: 700 !important; font-size: 13.5px !important; text-transform: none !important; height: 38px !important; }
.ng-drawer__compose-btn:hover { background: #572394 !important; }
.ng-drawer__rail-toggle { display: flex; align-items: center; justify-content: center; height: 28px; cursor: pointer; border-top: 1px solid rgba(255,255,255,0.05); transition: background 0.15s; }
.ng-drawer__rail-toggle:hover { background: rgba(255,255,255,0.05); }
.ng-nav__group-label { font-size: 9px; font-weight: 700; letter-spacing: 1.8px; color: rgba(255,255,255,0.22); text-transform: uppercase; }
.ng-nav__item { color: rgba(255,255,255,0.52) !important; min-height: 40px !important; transition: background 0.15s, color 0.15s; }
.ng-nav__item:hover { background: rgba(255,255,255,0.07) !important; color: rgba(255,255,255,0.82) !important; }
.ng-nav__item--active { background: #6F2DBD !important; color: #fff !important; }
.ng-nav__item--active:hover { background: #572394 !important; }
.ng-nav__item--active .ng-nav__icon  { color: #fff !important; }
.ng-nav__item--active .ng-nav__label { color: #fff !important; font-weight: 600; }
.ng-nav__item--logout:hover { background: rgba(200,29,109,0.15) !important; color: #DD5B99 !important; }
.ng-nav__icon  { color: rgba(255,255,255,0.4) !important; margin-inline-end: 10px !important; }
.ng-nav__label { font-size: 13.5px; font-weight: 500; }
.ng-nav__badge { background: #C81D6D; color: #fff; font-size: 10px; font-weight: 800; border-radius: 20px; padding: 1px 7px; min-width: 20px; text-align: center; }
.fade-label-enter-active { transition: opacity 0.2s ease; }
.fade-label-leave-active { transition: opacity 0.1s ease; }
.fade-label-enter-from, .fade-label-leave-to { opacity: 0; }
</style>
