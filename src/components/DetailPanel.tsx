import { FileText } from 'lucide-react'
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
  linkDetailSlot?: ReactNode
  aggregateTaskSlot?: ReactNode
  legacyNoticeSlot?: ReactNode
  viewerPinned: boolean
  onViewerPinnedChange: (value: boolean) => void
  viewerSlot?: ReactNode
  onDirectoryReadme?: (dirPath: string, dirId: string) => void
  hasDirectoryReadme?: boolean
  onSidebarWidthChange?: (widthPx: number) => void
  sidebarWidthPx?: number
  sidebarMinWidth?: number
  sidebarMaxWidth?: number
  metadataVisible: boolean
  onMetadataVisibleChange: (value: boolean) => void
  drawioDetailSlot?: ReactNode
  drawioFullscreen?: boolean
}

export function DetailPanel({
  manifest,
  node,
  jsonPreview,
  tskDetailSlot,
  linkDetailSlot,
  aggregateTaskSlot,
  legacyNoticeSlot,
  viewerPinned,
  onViewerPinnedChange,
  viewerSlot,
  onDirectoryReadme,
  hasDirectoryReadme,
  onSidebarWidthChange,
  sidebarWidthPx = 380,
  sidebarMinWidth = 280,
  sidebarMaxWidth = 960,
  metadataVisible,
  onMetadataVisibleChange,
  drawioDetailSlot,
  drawioFullscreen = false,
}: DetailPanelProps) {
  const showViewer = viewerPinned && viewerSlot && !drawioFullscreen
  const showAggregateTasks = Boolean(aggregateTaskSlot) && !drawioFullscreen
  const showTskDetail = Boolean(tskDetailSlot) && !showAggregateTasks
  const showLinkDetail = Boolean(linkDetailSlot) && !showAggregateTasks && !showTskDetail
  const showDrawioDetail =
    Boolean(drawioDetailSlot) && !showAggregateTasks && !showTskDetail && !showLinkDetail
  const showLegacyNotice = Boolean(legacyNoticeSlot) && !showDrawioDetail
  const showFileMetadata =
    metadataVisible &&
    !showViewer &&
    !showTskDetail &&
    !showLinkDetail &&
    !showDrawioDetail &&
    !showLegacyNotice &&
    !drawioFullscreen

  return (
    <aside className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden border-l border-zinc-200 dark:border-zinc-800">
      {onSidebarWidthChange && !drawioFullscreen && (
        <SidebarResizeHandle
          minWidth={sidebarMinWidth}
          maxWidth={sidebarMaxWidth}
          getCurrentWidth={() => sidebarWidthPx}
          onResize={onSidebarWidthChange}
        />
      )}

      {!drawioFullscreen && (
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
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {showViewer && (
        <div className="flex min-h-0 flex-1 flex-col border-b border-zinc-200 dark:border-zinc-800">
          <div className="min-h-0 flex-1 overflow-hidden">{viewerSlot}</div>
        </div>
      )}

        {showAggregateTasks && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{aggregateTaskSlot}</div>
        )}
        {showLegacyNotice && <div className="shrink-0">{legacyNoticeSlot}</div>}
        {showTskDetail && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{tskDetailSlot}</div>
        )}
        {showLinkDetail && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{linkDetailSlot}</div>
        )}
        {showDrawioDetail && drawioFullscreen && (
          <p className="flex flex-1 items-center justify-center px-3 py-6 text-center text-xs text-zinc-500">
            draw.io-Editor im Vollbild (Esc oder „Vollbild aus“ zum Beenden).
          </p>
        )}
        {showDrawioDetail && (
          <div
            className={
              drawioFullscreen
                ? 'hidden'
                : 'flex min-h-0 flex-1 flex-col overflow-hidden'
            }
          >
            {drawioDetailSlot}
          </div>
        )}

        {showFileMetadata && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
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
          </div>
        )}

        {!showTskDetail &&
          !showLinkDetail &&
          !showDrawioDetail &&
          !showLegacyNotice &&
          !showFileMetadata &&
          !showViewer && (
          <p className="flex flex-1 items-center justify-center px-3 py-6 text-center text-xs text-zinc-500">
            Optional: Index-Metadaten unter „Seitenleiste einstellen“ aktivieren.
          </p>
        )}
      </div>
    </aside>
  )
}