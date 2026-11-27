import { registerSW } from 'virtual:pwa-register'

/** Service Worker: App-Shell offline; Workspace-Zugriff bleibt online. */
export function registerFsidxServiceWorker(): void {
  if (!import.meta.env.PROD) return

  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('[fsidx] Offline-fähige App-Hülle bereit.')
    },
    onNeedRefresh() {
      console.info('[fsidx] Update verfügbar — Seite neu laden für die neue Version.')
    },
  })
}