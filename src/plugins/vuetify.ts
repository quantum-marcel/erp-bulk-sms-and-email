import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createVuetify } from 'vuetify'

// ── Newgas Brand Palette ───────────────────────────────────────────────────
// Primary red:  #D32129  (shade 5)
// Accent gold:  #FFDC00  (shade 5)
// Sidebar:      #1C0A0A  (near-black red-tinted dark)
// ─────────────────────────────────────────────────────────────────────────

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          // ── Brand ──────────────────────────────────────
          primary:    '#D32129',   // Newgas red (shade 5)
          'primary-darken-1': '#A91A21',  // shade 6
          'primary-darken-2': '#7F1419',  // shade 7
          'primary-lighten-1': '#DC4D54', // shade 4
          'primary-lighten-2': '#E57A7F', // shade 3

          secondary:  '#FFDC00',   // Newgas gold (shade 5)
          'secondary-darken-1': '#CCB000', // shade 6
          'secondary-darken-2': '#998400', // shade 7
          'secondary-lighten-1': '#FFE333', // shade 4

          // ── Surface & BG ───────────────────────────────
          surface:    '#FFFFFF',
          background: '#F9F5F5',   // very subtle warm tint

          // ── Semantic ───────────────────────────────────
          error:   '#D32129',      // same as primary (brand red)
          warning: '#FFDC00',      // brand gold as warning
          info:    '#1565C0',
          success: '#2E7D32',

          // ── UI tokens ──────────────────────────────────
          'on-primary':   '#FFFFFF',
          'on-secondary': '#1C0A0A',   // dark text on gold
          'sidebar-bg':   '#1C0A0A',   // very dark red-black
          'sidebar-active-bg': '#D32129',
          'topbar-bg':    '#FFFFFF',
          'card-border':  '#EDE0E0',
          'badge-bg':     '#FFDC00',
        },
      },
      dark: {
        colors: {
          primary:    '#E57A7F',   // lighter red for dark mode readability
          'primary-darken-1': '#D32129',
          secondary:  '#FFE333',
          'secondary-darken-1': '#FFDC00',
          surface:    '#1E1212',
          background: '#140C0C',
          error:      '#EF5350',
          warning:    '#FFD600',
          info:       '#42A5F5',
          success:    '#66BB6A',
          'on-primary':   '#FFFFFF',
          'on-secondary': '#1C0A0A',
          'sidebar-bg':   '#0F0606',
          'sidebar-active-bg': '#D32129',
          'topbar-bg':    '#1E1212',
          'card-border':  '#3A2020',
          'badge-bg':     '#FFDC00',
        },
      },
    },
  },
  defaults: {
    VBtn: {
      style: 'font-family: DM Sans, sans-serif; font-weight: 600; letter-spacing: 0.3px; text-transform: none;',
    },
    VCard: {
      elevation: 0,
    },
  },
})
