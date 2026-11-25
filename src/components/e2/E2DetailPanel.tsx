import { Maximize2, Minimize2, PenLine, Loader2, Save } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useRef } from 'react'
import { E2Embed, type E2EmbedHandle } from './E2Embed'

interface E2DetailPanelProps {
  filePath: string
  fileName: string
  json: string
  loading: boolean
  loadError: string | null
  canWrite: boolean
  saving?: boolean
  saveError?: string | null
  fullscreen: boolean
  onToggleFullscreen: () => void
  onJsonChange: (json: string, hostFileId: string, reason: 'autosave' | 'flush') => void
  onWidenPanel?: () => void
}

export function E2DetailPanel({
  fileName,
  json,
  loading,
  loadError,
  canWrite,
  saving,
  saveError,
  fullscreen,
  onToggleFullscreen,
  onJsonChange,
  onWidenPanel,
  filePath,
}: E2DetailPanelProps) {
  const embedRef = useRef<E2EmbedHandle>(null)

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
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
              canWrite
                ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {canWrite ? 'Bearbeiten' : 'Nur Lesen'}
          </span>
          {canWrite && !loading && !loadError && (
            <button
              type="button"
              onClick={() => embedRef.current?.requestFlush()}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[10px] font-medium dark:border-zinc-600"
            >
              <Save className="h-3.5 w-3.5" />
              Speichern
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
            title={fullscreen ? 'Vollbild beenden' : 'Vollbild'}
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

      {saving && (
        <p className="flex items-center gap-1 border-b border-zinc-100 px-3 py-1 text-[10px] text-zinc-500 dark:border-zinc-800">
          <Loader2 className="h-3 w-3 animate-spin" />
          Speichern…
        </p>
      )}
      {saveError && (
        <p className="border-b border-red-200 bg-red-50 px-3 py-1 text-[10px] text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {saveError}
        </p>
      )}

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
        <E2Embed
          ref={embedRef}
          hostFileId={filePath}
          json={json}
          canWrite={canWrite}
          onJsonChange={onJsonChange}
        />
      )}
    </div>
  )

  if (fullscreen) return createPortal(panel, document.body)
  return panel
}