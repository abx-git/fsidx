import { FileText, Maximize2, Minimize2, PanelBottomClose, PanelBottomOpen } from 'lucide-react'
import type { ReactNode } from 'react'
import { SidebarResizeHandle } from './SidebarResizeHandle'
import type { FileIndexManifest, IndexNode } from '../types'
import { formatBytes, formatDate } from '../lib/format'
import { DIRECTORY_README_NAME } from '../lib/directory-readme'

export interface Et2TaskFocusInfo {
  title: string
  folderLabel?: string | null
  dueDate?: string | null
  tags?: string[]
}

interface DetailPanelProps {
  manifest: FileIndexManifest
  node: IndexNode | null
  jsonPreview: string
  tasksMode?: boolean
  taskFocus?: Et2TaskFocusInfo | null
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
  tasksMode = false,
  taskFocus,
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
  const showMetadataBlock = metadataVisible && detailsVisible

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
      {/* Bedienteil — bleibt sichtbar */}
      <div className="shrink-0 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Seitenleiste</h2>
            <p className="text-xs text-zinc-500">
              {tasksMode ? 'Infos zur Aufgabe · optional Dateivorschau' : 'Details und optionale Vorschau'}
            </p>
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900/80">
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
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900/80">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              checked={metadataVisible}
              onChange={(e) => onMetadataVisibleChange(e.target.checked)}
            />
            <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-200">
              {metadataVisible ? (
                <PanelBottomOpen className="h-3.5 w-3.5 text-zinc-500" />
              ) : (
                <PanelBottomClose className="h-3.5 w-3.5 text-zinc-500" />
              )}
              Metadaten <strong className="font-medium">anzeigen</strong>
            </span>
          </label>
        </div>
        {viewerPinned && (
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">
            Vorschau bei Dateiauswahl · <strong>Vergrößern</strong> nutzt die ganze Seitenleiste · am
            linken Rand ziehen für die Breite.
          </p>
        )}
      </div>

      {showViewer && (
        <div
          className={`flex min-h-0 flex-col border-b border-zinc-200 dark:border-zinc-800 ${
            viewerExpanded || !metadataVisible
              ? 'min-h-0 flex-1'
              : 'h-[min(38vh,360px)] shrink-0'
          }`}
        >
          {onViewerExpandedChange && (
            <div className="flex shrink-0 justify-end border-b border-zinc-100 px-2 py-1 dark:border-zinc-800">
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
          <div className="min-h-0 flex-1 overflow-hidden">{viewerSlot}</div>
        </div>
      )}

      {!metadataVisible && detailsVisible && (
        <p className="shrink-0 px-3 py-3 text-center text-xs text-zinc-500">
          Metadaten ausgeblendet — Bedienteil oben wieder einschalten.
        </p>
      )}

      {showMetadataBlock && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {tasksMode && taskFocus && (
            <div className="shrink-0 border-b border-violet-100 bg-violet-50/50 px-3 py-3 dark:border-violet-900/40 dark:bg-violet-950/20">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{taskFocus.title}</h3>
              {taskFocus.folderLabel && (
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Ordner: {taskFocus.folderLabel}</p>
              )}
              {taskFocus.dueDate && (
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Fällig:{' '}
                  {Number.isNaN(Date.parse(taskFocus.dueDate))
                    ? taskFocus.dueDate
                    : new Date(taskFocus.dueDate).toLocaleDateString('de-DE')}
                </p>
              )}
              {taskFocus.tags && taskFocus.tags.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {taskFocus.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded bg-white px-1.5 py-0.5 text-[11px] text-violet-800 dark:bg-zinc-900 dark:text-violet-200"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                Bearbeiten erfolgt in der Mitte — keine Datei-IDs nötig.
              </p>
            </div>
          )}

          {node?.kind === 'directory' && onDirectoryReadme && !tasksMode && (
            <div className="shrink-0 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
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
              <p className="mt-1 text-[10px] text-zinc-500">Kurzbeschreibung für diesen Ordner.</p>
            </div>
          )}

          {!tasksMode && node ? (
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
          ) : !tasksMode ? (
            <p className="shrink-0 px-3 py-4 text-sm text-zinc-500">
              {viewerPinned
                ? 'Datei wählen — die Vorschau erscheint oben.'
                : 'Datei oder Ordner wählen für Details.'}
            </p>
          ) : null}

          <details className="shrink-0 border-b border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800">
            <summary className="cursor-pointer font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Technische Details (Index)
            </summary>
            {node ? (
              <dl className="mt-2 space-y-1.5 pb-2 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                <div>
                  <dt className="inline text-zinc-500">Pfad: </dt>
                  <dd className="inline break-all">{node.path || manifest.rootName}</dd>
                </div>
                <div>
                  <dt className="inline text-zinc-500">Typ: </dt>
                  <dd className="inline">{node.kind}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 pb-2 text-zinc-500">Kein Eintrag gewählt.</p>
            )}
            <pre className="max-h-48 overflow-auto rounded bg-zinc-50 p-2 font-mono text-[10px] leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {jsonPreview}
            </pre>
          </details>
        </div>
      )}
    </aside>
  )
}