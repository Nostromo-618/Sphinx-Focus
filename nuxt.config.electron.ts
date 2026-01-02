// https://nuxt.com/docs/api/configuration/nuxt-config
// Electron config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-electron'
  ],

  electron: {
    build: [
      { entry: 'electron/main.ts' }
    ]
  },

  devtools: {
    enabled: true
  },

  app: {
    // Use relative base path for static generation (works for both web and Electron)
    baseURL: '/',
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },

  ssr: false,

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  vite: {
    css: {
      devSourcemap: true
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router']
          }
        }
      }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
