import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary:    '#D32129',  
          'primary-darken-1': '#A91A21',  
          'primary-darken-2': '#7F1419',  
          'primary-lighten-1': '#DC4D54', 
          'primary-lighten-2': '#E57A7F', 

          secondary:  '#FFDC00',   
          'secondary-darken-1': '#CCB000', 
          'secondary-darken-2': '#998400', 
          'secondary-lighten-1': '#FFE333',

          surface:    '#FFFFFF',
          background: '#F9F5F5',   
          
          error:   '#D32129',      
          warning: '#FFDC00',      
          info:    '#1565C0',
          success: '#2E7D32',

          'on-primary':   '#FFFFFF',
          'on-secondary': '#1C0A0A',   
          'sidebar-bg':   '#1C0A0A',   
          'sidebar-active-bg': '#D32129',
          'topbar-bg':    '#FFFFFF',
          'card-border':  '#EDE0E0',
          'badge-bg':     '#FFDC00',
        },
      },
      dark: {
        colors: {
          primary:    '#E57A7F', 
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

