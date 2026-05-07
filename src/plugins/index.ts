import type { App } from 'vue'
import vuetify from './vuetify'
import router from '../router'
import { createPinia } from 'pinia'
import piniaPersistedstate from 'pinia-plugin-persistedstate'

export function registerPlugins(app: App) {
  const pinia = createPinia()
  pinia.use(piniaPersistedstate)

  app
    .use(pinia)
    .use(vuetify)
    .use(router)
}
