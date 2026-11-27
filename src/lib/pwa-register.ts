import { registerSW } from 'virtual:pwa-register'

type UpdateListener = (reload: () => void) => void

const listeners = new Set<UpdateListener>()

/** Einblendung z. B. dezentes Banner — nur auf der Haupt-App, nicht auf e2-edit/rbase-open. */
export function onPwaUpdateAvailable(listener: UpdateListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyUpdate(reload: () => void) {
  for (const listener of listeners) listener(reload)
}

/** Service Worker nur für die Haupt-App (`index.html`). */
export function registerFsidxServiceWorker(): void {
  if (!import.meta.env.PROD) return

  registerSW({
    immediate: false,
    onNeedRefresh() {
      notifyUpdate(() => {
        window.location.reload()
      })
    },
  })
}