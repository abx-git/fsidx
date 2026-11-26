import { Database, ExternalLink } from 'lucide-react'
import type { RBaseViewerSlice } from '../viewers/RBaseViewer'
import { openRBaseApp, openRBaseOpenTab } from '../../lib/r-base/r-base-app-link'
import {
  datasetFolderFromMetaPath,
  workspaceRootFromProjectPath,
  rBaseWorkspaceRootFromPath,
} from '../../lib/r-base/r-base-paths'

interface RBaseDetailPanelProps {
  filePath: string
  fileName: string
  rBase: RBaseViewerSlice
  indexedPaths: string[]
}

export function RBaseDetailPanel({ filePath, fileName, rBase, indexedPaths }: RBaseDetailPanelProps) {
  const locId = rBase.dataset?.locId ?? null
  const workspaceRoot =
    rBase.kind === 'project'
      ? workspaceRootFromProjectPath(filePath)
      : rBaseWorkspaceRootFromPath(filePath, indexedPaths)
  const datasetFolder = datasetFolderFromMetaPath(filePath)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-900 dark:text-sky-200">
            <Database className="h-4 w-4" />
            R-Base
          </p>
          <p className="truncate font-mono text-[10px] text-zinc-500" title={fileName}>
            {fileName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Vorschau
          </span>
          {!rBase.loading && !rBase.error && (
            <>
              <button
                type="button"
                onClick={() => openRBaseOpenTab(filePath)}
                className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                In R-Base öffnen…
              </button>
              <button
                type="button"
                onClick={() => openRBaseApp(locId)}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[10px] font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
              >
                R-Base-App
              </button>
            </>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 text-sm">
        {rBase.loading && <p className="text-zinc-500">Laden…</p>}
        {rBase.error && <p className="text-red-700 dark:text-red-400">{rBase.error}</p>}
        {!rBase.loading && !rBase.error && rBase.kind === 'dataset' && rBase.dataset && (
          <div className="space-y-2">
            <p className="font-mono text-lg">{rBase.dataset.locId}</p>
            <p>{rBase.dataset.bezeichnung || '—'}</p>
            <p className="text-xs text-zinc-500">
              {rBase.dataset.files.length} Datei(en) · Ordner{' '}
              <span className="font-mono">{datasetFolder || '.'}</span>
              {workspaceRoot != null && workspaceRoot !== datasetFolder && (
                <>
                  {' '}
                  · Workspace <span className="font-mono">{workspaceRoot || '(Stamm)'}</span>
                </>
              )}
            </p>
          </div>
        )}
        {!rBase.loading && !rBase.error && rBase.kind === 'project' && (
          <p className="text-zinc-700 dark:text-zinc-300">
            R-Base-Workspace unter{' '}
            <span className="font-mono text-xs">{workspaceRoot || '(Stamm)'}</span>
          </p>
        )}
      </div>
    </div>
  )
}