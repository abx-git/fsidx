import { ArrowLeft, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { usePreviewLoadTimeout } from '../../hooks/usePreviewLoadTimeout'

interface ViewerShellProps {
  title: string
  subtitle: string
  onClose: () => void
  showBackButton?: boolean
  /** Nur Inhalt, ohne fsidx-Kopfzeile (z. B. draw.io-Vorschau in der Seitenleiste). */
  hideHeader?: boolean
  /** Volle Höhe der Seitenleiste (angeheftete Dateivorschau). */
  fillHeight?: boolean
  loading?: boolean
  error?: string | null
  toolbar?: ReactNode
  children: ReactNode
}

export function ViewerShell({
  title,
  subtitle,
  onClose,
  showBackButton = true,
  hideHeader = false,
  fillHeight = false,
  loading,
  error,
  toolbar,
  children,
}: ViewerShellProps) {
  usePreviewLoadTimeout(Boolean(loading) && !error, onClose)

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-zinc-950">
      {!hideHeader && (
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-2">
            {showBackButton && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Zurück
              </button>
            )}
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="truncate font-mono text-[11px] text-zinc-500">{subtitle}</p>
            </div>
          </div>
          {toolbar}
        </header>
      )}
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          fillHeight || hideHeader ? 'overflow-hidden' : 'overflow-auto'
        }`}
      >
        {loading && (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Wird geladen…
          </p>
        )}
        {!loading && error && (
          <p className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
        {!loading && !error && children}
      </div>
    </section>
  )
}