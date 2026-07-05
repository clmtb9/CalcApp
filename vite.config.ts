import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { ManifestOptions } from 'vite-plugin-pwa'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'CalcApp'
const isPagesBuild = process.env.GITHUB_ACTIONS === 'true'
const basePath = isPagesBuild ? `/${repoName}/` : '/'
const buildId = process.env.GITHUB_SHA?.slice(0, 7) ?? 'local-dev'

const pwaManifest: Partial<ManifestOptions> = {
  id: basePath,
  name: 'Calculatrice scientifique',
  short_name: 'CalcSci',
  description: 'Clone PWA de la calculatrice scientifique specifiee par YAML.',
  theme_color: '#000000',
  background_color: '#000000',
  display: 'standalone',
  start_url: basePath,
  scope: basePath,
  icons: [
    {
      src: 'icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: 'icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'maskable',
    },
  ],
}

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.svg'],
      manifest: pwaManifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `${basePath}index.html`,
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
