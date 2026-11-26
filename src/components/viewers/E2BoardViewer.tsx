import { ExternalLink } from 'lucide-react'
import { E2Embed } from '../e2/E2Embed'
import { ViewerShell } from './ViewerShell'
import { openE2EditorTab } from '../../lib/e2/e2-editor-tab'

export interface E2BoardViewerSlice {
  json: string
  loading: boolean
  error: string | null
  canWrite: boolean
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
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        Vorschau
      </span>
      {e2.canWrite && !e2.loading && !e2.error && (
        <button
          type="button"
          onClick={() => openE2EditorTab(filePath)}
          className="inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          In E2 bearbeiten…
        </button>
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
      error={e2.error}
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
            hostFileId={filePath}
            json={e2.json}
            canWrite={false}
            className={fillHeight ? 'min-h-0' : 'min-h-[min(80vh,900px)]'}
          />
        </div>
      )}
    </ViewerShell>
  )
}