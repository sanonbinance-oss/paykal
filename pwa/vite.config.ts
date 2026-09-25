import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Projet Supabase de production
const SUPABASE_HOST = 'sxtlttaswhodbtcjjdyn.supabase.co'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'PayKal — Messagerie',
        short_name: 'PayKal',
        description:
          'Messagerie entre parents et écoles, et paiement de la scolarité à distance par capture décran.',
        lang: 'fr',
        dir: 'ltr',
        theme_color: '#0D47A1',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Permet douvrir la PWA hors-ligne (coquille applicative en cache)
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Lecture hors-ligne des dernières données Supabase déjà vues
            urlPattern: new RegExp(`^https://${SUPABASE_HOST.replace(/\./g, '\\.')}/rest/v1/.*`),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'paykal-supabase-rest',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: new RegExp(`^https://${SUPABASE_HOST.replace(/\./g, '\\.')}/storage/v1/.*`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'paykal-supabase-storage',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
