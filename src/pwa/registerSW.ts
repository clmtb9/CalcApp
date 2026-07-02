import { registerSW } from 'virtual:pwa-register'

export function registerServiceWorker() {
  const purgeLegacyRuntimeCaches = async () => {
    if (!('caches' in window)) {
      return
    }
    try {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((name) => name === 'assets-cache' || name === 'documents-cache')
          .map((name) => caches.delete(name)),
      )
    } catch {
      // Ignore cache API failures.
    }
  }

  const hadController = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    ? Boolean(navigator.serviceWorker.controller)
    : false
  let hasReloadedOnControllerChange = false

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      if (registration) {
        console.info('Service worker enregistre:', swUrl)

        if (registration.waiting) {
          updateSW(true)
        }

        // Poll updates regularly so users get fresh UI without manual MAJ action.
        window.setInterval(() => {
          registration.update().catch(() => {
            // Ignore transient network errors.
          })
        }, 60_000)
      }
    },
    onNeedRefresh() {
      // Auto-apply update when a new worker is ready.
      updateSW(true)
    },
    onOfflineReady() {
      console.info('Application disponible hors ligne.')
    },
  })

  if ('serviceWorker' in navigator) {
    void purgeLegacyRuntimeCaches()

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || hasReloadedOnControllerChange) {
        return
      }
      hasReloadedOnControllerChange = true
      window.location.reload()
    })
  }
}
