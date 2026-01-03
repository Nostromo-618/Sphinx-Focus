// https://nuxt.com/docs/api/configuration/nuxt-config
// Web-only config (no Electron)
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  // Provide empty build array so nuxt-electron does nothing
  electron: {
    build: [],
    disableDefaultOptions: true
  },

  devtools: {
    enabled: true
  },

  app: {
    // GitHub Pages serves from /Sphinx-Focus/ subdirectory
    baseURL: '/Sphinx-Focus/',
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/Sphinx-Focus/favicon.svg' }
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
