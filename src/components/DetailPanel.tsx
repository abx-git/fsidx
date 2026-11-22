import { FileText, Maximize2, Minimize2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { SidebarResizeHandle } from './SidebarResizeHandle'
import type { FileIndexManifest, IndexNode } from '../types'
import { formatBytes, formatDate } from '../lib/format'
import { DIRECTORY_README_NAME, directoryReadmePath } from '../lib/directory-readme'

interface DetailPanelProps {
  manifest: FileIndexManifest
  node: IndexNode | null
  jsonPreview: string
  viewerPinned: boolean
  onViewerPinnedChange: (value: boolean) => void
  viewerSlot?: ReactNode
  onDirectoryReadme?: (dirPath: string, dirId: string) => void
  hasDirectoryReadme?: boolean
  viewerExpanded?: boolean
  onViewerExpandedChange?: (expanded: boolean) => void
  onSidebarWidthChange?: (widthPx: number) => void
  sidebarWidthPx?: number
  sidebarMinWidth?: number
  sidebarMaxWidth?: number
}

export function DetailPanel({
  manifest,
  node,
  jsonPreview,
  viewerPinned,
  onViewerPinnedChange,
  viewerSlot,
  onDirectoryReadme,
  hasDirectoryReadme,
  viewerExpanded = false,
  onViewerExpandedChange,
  onSidebarWidthChange,
  sidebarWidthPx = 380,
  sidebarMinWidth = 280,
  sidebarMaxWidth = 960,
}: DetailPanelProps) {
  const showViewer = viewerPinned && viewerSlot
  const detailsVisible = !showViewer || !viewerExpanded

  return (
    <aside className="relative flex h-full min-h-0 flex-col border-l border-zinc-200 dark:border-zinc-800">
      {onSidebarWidthChange && (
        <SidebarResizeHandle
          minWidth={sidebarMinWidth}
          maxWidth={sidebarMaxWidth}
          getCurrentWidth={() => sidebarWidthPx}
          onResize={onSidebarWidthChange}
        />
      )}
      <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Seitenleiste</h2>
            <p className="text-xs text-zinc-500">Metadaten und optional Vorschau</p>
          </div>
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900/80">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            checked={viewerPinned}
            onChange={(e) => onViewerPinnedChange(e.target.checked)}
          />
          <span className="text-zinc-700 dark:text-zinc-200">
            Viewer <strong className="font-medium">ständig aktiviert</strong>
          </span>
        </label>
        {viewerPinned && (
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">
            Vorschau bei Dateiauswahl · <strong>Vergrößern</strong> nutzt die ganze Seitenleiste ·
            am linken Rand ziehen für die Breite.
          </p>
        )}
      </div>

      {showViewer && (
        <div
          className={`flex min-h-0 flex-col border-b border-zinc-200 dark:border-zinc-800 ${
            viewerExpanded ? 'flex-1' : 'min-h-[min(38vh,360px)] flex-1'
          }`}
        >
          {onViewerExpandedChange && (
            <div className="flex justify-end border-b border-zinc-100 px-2 py-1 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => onViewerExpandedChange(!viewerExpanded)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title={viewerExpanded ? 'Viewer in Seitenleiste verkleinern' : 'Viewer vergrößern'}
              >
                {viewerExpanded ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    Verkleinern
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    Vergrößern
                  </>
                )}
              </button>
            </div>
          )}
          <div className="min-h-0 flex-1">{viewerSlot}</div>
        </div>
      )}

      {node?.kind === 'directory' && onDirectoryReadme && detailsVisible && (
        <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onDirectoryReadme(node.path, node.id)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
          >
            <FileText className="h-3.5 w-3.5" />
            {hasDirectoryReadme
              ? `${DIRECTORY_README_NAME} bearbeiten`
              : `${DIRECTORY_README_NAME} anlegen`}
          </button>
          <p className="mt-1 text-[10px] text-zinc-500">
            Beschreibt den Inhalt dieses Ordners ({directoryReadmePath(node.path)}).
          </p>
        </div>
      )}

      {detailsVisible && node ? (
        <dl className="space-y-2 border-b border-zinc-200 px-3 py-3 text-sm dark:border-zinc-800">
          <div>
            <dt className="text-xs text-zinc-500">Name</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">{node.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Path</dt>
            <dd className="break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {node.path || manifest.rootName}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Kind</dt>
            <dd>{node.kind}</dd>
          </div>
          {node.extension && (
            <div>
              <dt className="text-xs text-zinc-500">Extension</dt>
              <dd>.{node.extension}</dd>
            </div>
          )}
          {node.mimeHint && (
            <div>
              <dt className="text-xs text-zinc-500">MIME hint</dt>
              <dd className="font-mono text-xs">{node.mimeHint}</dd>
            </div>
          )}
          {node.kind === 'file' && (
            <div>
              <dt className="text-xs text-zinc-500">Size</dt>
              <dd>{formatBytes(node.size ?? 0)}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-zinc-500">Modified</dt>
            <dd>{formatDate(node.lastModified)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Node id</dt>
            <dd className="font-mono text-xs">{node.id}</dd>
          </div>
        </dl>
      ) : detailsVisible ? (
        <p className="px-3 py-4 text-sm text-zinc-500">
          {viewerPinned
            ? 'Datei wählen — die Vorschau erscheint oben.'
            : 'Datei oder Ordner wählen, um Metadaten anzuzeigen.'}
        </p>
      ) : null}

      {detailsVisible && (
      <div className={`flex min-h-0 flex-col ${showViewer && !viewerExpanded ? 'max-h-40' : 'flex-1'}`}>
        <div className="border-b border-zinc-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
          JSON
        </div>
        <pre className="min-h-0 flex-1 overflow-auto bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {jsonPreview}
        </pre>
      </div>
      )}
    </aside>
  )
}