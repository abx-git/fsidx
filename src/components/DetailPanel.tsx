import { FileText, Maximize2, Minimize2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { SidebarResizeHandle } from './SidebarResizeHandle'
import type { FileIndexManifest, IndexNode } from '../types'
import { formatBytes, formatDate } from '../lib/format'
import { DIRECTORY_README_NAME } from '../lib/directory-readme'
import { CollapsibleSection } from './ui/CollapsibleSection'

interface DetailPanelProps {
  manifest: FileIndexManifest
  node: IndexNode | null
  jsonPreview: string
  tskDetailSlot?: ReactNode
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
  metadataVisible: boolean
  onMetadataVisibleChange: (value: boolean) => void
}

export function DetailPanel({
  manifest,
  node,
  jsonPreview,
  tskDetailSlot,
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
  metadataVisible,
  onMetadataVisibleChange,
}: DetailPanelProps) {
  const showViewer = viewerPinned && viewerSlot
  const detailsVisible = !showViewer || !viewerExpanded
  const showTskDetail = Boolean(tskDetailSlot)
  const showFileMetadata = metadataVisible && detailsVisible && !showTskDetail

  return (
    <aside className="relative flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-zinc-200 dark:border-zinc-800">
      {onSidebarWidthChange && (
        <SidebarResizeHandle
          minWidth={sidebarMinWidth}
          maxWidth={sidebarMaxWidth}
          getCurrentWidth={() => sidebarWidthPx}
          onResize={onSidebarWidthChange}
        />
      )}

      <div className="shrink-0 border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-800">
        <CollapsibleSection summary="Seitenleiste einstellen" className="px-1">
          <div className="space-y-1.5 pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-zinc-300 text-emerald-600"
                checked={viewerPinned}
                onChange={(e) => onViewerPinnedChange(e.target.checked)}
              />
              Dateivorschau anheften
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-zinc-300 text-emerald-600"
                checked={metadataVisible}
                onChange={(e) => onMetadataVisibleChange(e.target.checked)}
              />
              Index-Metadaten anzeigen
            </label>
          </div>
        </CollapsibleSection>
      </div>

      {showViewer && (
        <div
          className={`flex min-h-0 flex-col border-b border-zinc-200 dark:border-zinc-800 ${
            viewerExpanded || !metadataVisible ? 'min-h-0 flex-1' : 'h-[min(38vh,360px)] shrink-0'
          }`}
        >
          {onViewerExpandedChange && (
            <div className="flex shrink-0 justify-end border-b border-zinc-100 px-2 py-0.5 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => onViewerExpandedChange(!viewerExpanded)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {viewerExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                {viewerExpanded ? 'Kleiner' : 'Größer'}
              </button>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">{viewerSlot}</div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {showTskDetail && <div className="flex min-h-0 flex-1 flex-col">{tskDetailSlot}</div>}

        {showFileMetadata && (
          <>
            {node?.kind === 'directory' && onDirectoryReadme && (
              <div className="shrink-0 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => onDirectoryReadme(node.path, node.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {hasDirectoryReadme ? `${DIRECTORY_README_NAME} bearbeiten` : 'Ordnerbeschreibung'}
                </button>
              </div>
            )}

            {node ? (
              <dl className="shrink-0 space-y-2 border-b border-zinc-200 px-3 py-3 text-sm dark:border-zinc-800">
                <div>
                  <dt className="text-xs text-zinc-500">Name</dt>
                  <dd className="font-medium text-zinc-900 dark:text-zinc-100">{node.name}</dd>
                </div>
                {node.kind === 'file' && (
                  <div>
                    <dt className="text-xs text-zinc-500">Größe</dt>
                    <dd>{formatBytes(node.size ?? 0)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-zinc-500">Geändert</dt>
                  <dd>{formatDate(node.lastModified)}</dd>
                </div>
              </dl>
            ) : (
              <p className="shrink-0 px-3 py-4 text-sm text-zinc-500">
                {viewerPinned ? 'Datei wählen für Vorschau.' : 'Datei oder Ordner wählen.'}
              </p>
            )}

            <CollapsibleSection summary="Technische Index-Daten" className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
              {node ? (
                <dl className="mt-1 space-y-1 pb-2 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div>
                    <dt className="inline text-zinc-500">Pfad: </dt>
                    <dd className="inline break-all">{node.path || manifest.rootName}</dd>
                  </div>
                </dl>
              ) : null}
              <pre className="max-h-40 overflow-auto rounded bg-zinc-50 p-2 font-mono text-[10px] leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {jsonPreview}
              </pre>
            </CollapsibleSection>
          </>
        )}

        {!showTskDetail && !showFileMetadata && !showViewer && (
          <p className="px-3 py-6 text-center text-xs text-zinc-500">
            Optional: Index-Metadaten unter „Seitenleiste einstellen“ aktivieren.
          </p>
        )}
      </div>
    </aside>
  )
}