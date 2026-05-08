import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Fonts from 'unplugin-fonts/vite'
import Layouts from 'vite-plugin-vue-layouts'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    // 1. VueRouter MUST come before Layouts
    VueRouter({
      dts: 'src/typed-router.d.ts',
      // Reads pages from src/pages/ and generates typed routes
    }),

    // 2. Layouts wraps each page component in its declared layout
    Layouts({
      layoutsDirs: 'src/layouts',
      defaultLayout: 'default',
    }),

    AutoImport({
      imports: [
        'vue',
        'pinia',
        {
          'vue-router/auto': ['useRoute', 'useRouter'],
        },
      ],
      dts: 'src/auto-imports.d.ts',
      eslintrc: { enabled: true },
      vueTemplate: true,
    }),

    Components({
      dts: 'src/components.d.ts',
    }),

    Vue({
      template: { transformAssetUrls },
    }),

    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),

    Fonts({
      google: {
        families: [
          {
            name: 'DM Sans',
            styles: 'wght@300;400;500;600;700',
          },
        ],
      },
    }),
  ],

  define: { 'process.env': {} },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
  },

  server: {
    port: 3000,
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
})

