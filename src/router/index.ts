import { createRouter, createWebHistory } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import { routes } from 'vue-router/auto-routes'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (to.path === '/login') {
    if (authStore.isAuthenticated) return next('/dashboard')
    return next()
  }

  const isAuth = await authStore.checkAuth()
  if (!isAuth) return next('/login')
  if (['/companies', '/users', '/assignments'].includes(to.path) && !authStore.isAdmin) {
    return next('/dashboard')
  }
  if (!authStore.hasCompany && (to.path.startsWith('/campaign-detail-') || (to.path === '/compose' && to.query.edit))) return next('/campaigns')
  next()
})

export default router
