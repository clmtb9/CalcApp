import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { ManifestOptions } from 'vite-plugin-pwa'

const pwaManifest: Partial<ManifestOptions> = {
  name: 'Calculatrice scientifique',
  short_name: 'CalcSci',
  description: 'Clone PWA de la calculatrice scientifique specifiee par YAML.',
  theme_color: '#0a1628',
  background_color: '#0a1628',
  display: 'standalone',
  start_url: '/',
  icons: [
    {
      src: '/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
  ],
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: pwaManifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'documents-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assets-cache',
              networkTimeoutSeconds: 2,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
