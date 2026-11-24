import { Maximize2, Minimize2, PenLine, Loader2 } from 'lucide-react'
import { DrawioEmbed } from './DrawioEmbed'

interface DrawioDetailPanelProps {
  filePath: string
  fileName: string
  xml: string
  loading: boolean
  loadError: string | null
  canWrite: boolean
  saving?: boolean
  saveError?: string | null
  fullscreen: boolean
  onToggleFullscreen: () => void
  onXmlChange: (xml: string) => void
  onWidenPanel?: () => void
}

export function DrawioDetailPanel({
  fileName,
  xml,
  loading,
  loadError,
  canWrite,
  saving,
  saveError,
  fullscreen,
  onToggleFullscreen,
  onXmlChange,
  onWidenPanel,
}: DrawioDetailPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-orange-900 dark:text-orange-200">
            <PenLine className="h-4 w-4" />
            draw.io
          </p>
          <p className="truncate font-mono text-[10px] text-zinc-500" title={fileName}>
            {fileName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
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
        <p className="flex shrink-0 items-center gap-1.5 border-b border-zinc-100 px-3 py-1 text-[10px] text-zinc-500 dark:border-zinc-800">
          <Loader2 className="h-3 w-3 animate-spin" />
          Speichert…
        </p>
      )}
      {saveError && (
        <p className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-1 text-[10px] text-red-800 dark:border-red-900/40 dark:bg-red-950/40">
          {saveError}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {loading && (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Datei wird geladen…
          </p>
        )}
        {loadError && <p className="px-3 py-4 text-sm text-red-600">{loadError}</p>}
        {!loading && !loadError && xml && (
          <DrawioEmbed
            xml={xml}
            mode="editor"
            readOnly={!canWrite}
            onXmlChange={canWrite ? onXmlChange : undefined}
            className="flex-1"
          />
        )}
      </div>
    </div>
  )
}