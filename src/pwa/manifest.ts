export const pwaManifest = {
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
