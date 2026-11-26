import { ExternalLink, Maximize2, Minimize2, PenLine, Loader2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { E2Embed } from './E2Embed'
import { openE2EditorTab } from '../../lib/e2/e2-editor-tab'

interface E2DetailPanelProps {
  filePath: string
  fileName: string
  json: string
  loading: boolean
  loadError: string | null
  canWrite: boolean
  fullscreen: boolean
  onToggleFullscreen: () => void
  onWidenPanel?: () => void
}

export function E2DetailPanel({
  fileName,
  json,
  loading,
  loadError,
  canWrite,
  fullscreen,
  onToggleFullscreen,
  onWidenPanel,
  filePath,
}: E2DetailPanelProps) {
  const panel = (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[1100] flex h-dvh w-screen max-w-none flex-col overflow-hidden bg-white dark:bg-zinc-950'
          : 'flex h-full min-h-0 flex-col overflow-hidden'
      }
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-900 dark:text-violet-200">
            <PenLine className="h-4 w-4" />
            E2 Domänenmodell
          </p>
          <p className="truncate font-mono text-[10px] text-zinc-500" title={fileName}>
            {fileName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Vorschau
          </span>
          {canWrite && !loading && !loadError && (
            <button
              type="button"
              onClick={() => openE2EditorTab(filePath)}
              className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-900 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
              title="Bearbeitung in eigenem Tab — pro Datei ein Tab, Speichern nur in diese Datei"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              In E2 bearbeiten…
            </button>
          )}
          {onWidenPanel && !fullscreen && (
            <button
              type="button"
              onClick={onWidenPanel}
              className="rounded-md border border-zinc-300 px-2 py-1 text-[10px] font-medium dark:border-zinc-600"
            >
              Panel verbreitern
            </button>
          )}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[10px] font-medium dark:border-zinc-600"
            title={fullscreen ? 'Vollbild beenden' : 'Vorschau Vollbild'}
          >
            {fullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" /> Vollbild aus
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" /> Vollbild
              </>
            )}
          </button>
        </div>
      </div>

      {loading || loadError ? (
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-zinc-500">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Datei wird gelesen…
            </span>
          ) : (
            loadError
          )}
        </div>
      ) : (
        <E2Embed hostFileId={filePath} json={json} canWrite={false} className="min-h-0 flex-1" />
      )}
    </div>
  )

  if (fullscreen) return createPortal(panel, document.body)
  return panel
}