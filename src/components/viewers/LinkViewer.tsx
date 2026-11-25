import { ExternalLink, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ViewerShell } from './ViewerShell'

interface LinkViewerProps {
  fileName: string
  filePath: string
  title: string
  url: string
  loading?: boolean
  error?: string | null
  onClose: () => void
  showBackButton?: boolean
  fillHeight?: boolean
}

export function LinkViewer({
  fileName,
  filePath,
  title,
  url,
  loading,
  error,
  onClose,
  showBackButton = true,
  fillHeight = false,
}: LinkViewerProps) {
  const [frameBlocked, setFrameBlocked] = useState(false)
  const [frameKey, setFrameKey] = useState(0)

  const subtitle = useMemo(() => url || filePath, [url, filePath])

  return (
    <ViewerShell
      title={title || fileName}
      subtitle={subtitle}
      onClose={onClose}
      showBackButton={showBackButton}
      fillHeight={fillHeight}
      loading={loading}
      error={error}
      toolbar={
        url ? (
          <div className="flex flex-wrap gap-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Im Tab öffnen
            </a>
            <button
              type="button"
              onClick={() => {
                setFrameBlocked(false)
                setFrameKey((k) => k + 1)
              }}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] dark:border-zinc-600"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Neu laden
            </button>
          </div>
        ) : undefined
      }
    >
      {!loading && !error && url && (
        <div
          className={
            fillHeight
              ? 'flex h-full min-h-0 flex-1 flex-col'
              : 'flex h-full min-h-[min(70vh,480px)] flex-col'
          }
        >
          {frameBlocked && (
            <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              Die Seite lässt sich hier oft nicht einbetten (X-Frame-Options). Nutze „Im Tab öffnen“.
            </p>
          )}
          <iframe
            key={frameKey}
            title={title || fileName}
            src={url}
            className="min-h-0 w-full flex-1 border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            onLoad={() => {
              /* kein zuverlässiger Frame-Detection — Hinweis bei Nutzer-Aktion */
            }}
            onError={() => setFrameBlocked(true)}
          />
        </div>
      )}
    </ViewerShell>
  )
}