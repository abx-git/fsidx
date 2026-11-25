import { useRef } from 'react'
import { Loader2, Save } from 'lucide-react'
import { E2Embed, type E2EmbedHandle } from '../e2/E2Embed'
import { ViewerShell } from './ViewerShell'

export interface E2BoardViewerSlice {
  json: string
  loading: boolean
  error: string | null
  canWrite: boolean
  saving?: boolean
  saveError?: string | null
  onJsonChange: (json: string, hostFileId: string, reason: 'autosave' | 'flush') => void
}

interface E2BoardViewerProps {
  fileName: string
  filePath: string
  onClose: () => void
  showBackButton?: boolean
  fillHeight?: boolean
  e2: E2BoardViewerSlice
}

export function E2BoardViewer({
  fileName,
  filePath,
  onClose,
  showBackButton,
  fillHeight = false,
  e2,
}: E2BoardViewerProps) {
  const embedRef = useRef<E2EmbedHandle>(null)

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
          e2.canWrite
            ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200'
            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
        }`}
      >
        {e2.canWrite ? 'Bearbeiten' : 'Nur Lesen'}
      </span>
      {e2.canWrite && (
        <button
          type="button"
          onClick={() => embedRef.current?.requestFlush()}
          disabled={e2.loading || Boolean(e2.error)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
        >
          <Save className="h-3.5 w-3.5" />
          Speichern
        </button>
      )}
      {e2.saving && (
        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Schreibt…
        </span>
      )}
    </div>
  )

  return (
    <ViewerShell
      title={`E2 · ${fileName}`}
      subtitle={filePath}
      onClose={onClose}
      showBackButton={showBackButton}
      fillHeight={fillHeight}
      loading={e2.loading}
      error={e2.error ?? e2.saveError}
      toolbar={toolbar}
    >
      {!e2.loading && !e2.error && (
        <div
          className={
            fillHeight
              ? 'flex h-full min-h-0 flex-1 flex-col'
              : 'flex min-h-[min(80vh,900px)] flex-1 flex-col'
          }
        >
          <E2Embed
            ref={embedRef}
            hostFileId={filePath}
            json={e2.json}
            canWrite={e2.canWrite}
            onJsonChange={e2.onJsonChange}
            className={fillHeight ? 'min-h-0' : 'min-h-[min(80vh,900px)]'}
          />
        </div>
      )}
    </ViewerShell>
  )
}