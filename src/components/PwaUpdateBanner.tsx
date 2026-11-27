import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { onPwaUpdateAvailable } from '../lib/pwa-register'

export function PwaUpdateBanner() {
  const [reload, setReload] = useState<(() => void) | null>(null)

  useEffect(() => {
    return onPwaUpdateAvailable((doReload) => {
      setReload(() => doReload)
    })
  }, [])

  if (!reload) return null

  return (
    <p
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
    >
      <span>Neue fsidx-Version bereit.</span>
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => reload()}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 font-medium text-white hover:bg-emerald-500"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Aktualisieren
        </button>
        <button
          type="button"
          onClick={() => setReload(null)}
          className="rounded p-0.5 text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
          title="Später"
          aria-label="Hinweis schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    </p>
  )
}