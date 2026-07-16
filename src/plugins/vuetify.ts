import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary:    '#6F2DBD',
          'primary-darken-1': '#572394',
          'primary-darken-2': '#35145F',
          'primary-lighten-1': '#8B4FD0',
          'primary-lighten-2': '#B492E0',

          secondary:  '#C81D6D',
          'secondary-darken-1': '#9E1857',
          'secondary-darken-2': '#761141',
          'secondary-lighten-1': '#DD5B99',

          surface:    '#FFFFFF',
          background: '#F8F6FA',
          
          error:   '#C62828',
          warning: '#B7791F',
          info:    '#1565C0',
          success: '#2E7D32',

          'on-primary':   '#FFFFFF',
          'on-secondary': '#FFFFFF',
          'sidebar-bg':   '#15091F',
          'sidebar-active-bg': '#6F2DBD',
          'topbar-bg':    '#FFFFFF',
          'card-border':  '#E7DFF0',
          'badge-bg':     '#C81D6D',
        },
      },
      dark: {
        colors: {
          primary:    '#B492E0',
          'primary-darken-1': '#6F2DBD',
          secondary:  '#DD5B99',
          'secondary-darken-1': '#C81D6D',
          surface:    '#1D1228',
          background: '#110A18',
          error:      '#EF5350',
          warning:    '#D69E2E',
          info:       '#42A5F5',
          success:    '#66BB6A',
          'on-primary':   '#FFFFFF',
          'on-secondary': '#FFFFFF',
          'sidebar-bg':   '#0E0715',
          'sidebar-active-bg': '#6F2DBD',
          'topbar-bg':    '#1D1228',
          'card-border':  '#39264D',
          'badge-bg':     '#C81D6D',
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
