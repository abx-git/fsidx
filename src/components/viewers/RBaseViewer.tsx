import { Database, ExternalLink } from 'lucide-react'
import type { RBaseDatasetMeta, RBaseProjectConfigFile } from '../../lib/r-base/r-base-meta'
import {
  datasetFolderFromMetaPath,
  rBaseWorkspaceRootFromPath,
  workspaceRootFromProjectPath,
} from '../../lib/r-base/r-base-paths'
import { openRBaseApp, openRBaseOpenTab } from '../../lib/r-base/r-base-app-link'
import { ViewerShell } from './ViewerShell'

export interface RBaseViewerSlice {
  kind: 'dataset' | 'project' | null
  dataset: RBaseDatasetMeta | null
  project: RBaseProjectConfigFile | null
  loading: boolean
  error: string | null
  workspaceRoot: string | null
}

interface RBaseViewerProps {
  fileName: string
  filePath: string
  onClose: () => void
  showBackButton?: boolean
  fillHeight?: boolean
  indexedPaths: string[]
  rBase: RBaseViewerSlice
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function DatasetBody({ meta, datasetFolder }: { meta: RBaseDatasetMeta; datasetFolder: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Loc-ID</p>
          <p className="font-mono text-base text-zinc-900 dark:text-zinc-100">{meta.locId}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Bezeichnung</p>
          <p className="text-zinc-900 dark:text-zinc-100">{meta.bezeichnung || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Kategorie</p>
          <p className="text-zinc-800 dark:text-zinc-200">{meta.kategorie || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Ordner</p>
          <p className="truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">
            {datasetFolder || '(Stamm)'}
          </p>
        </div>
      </div>
      {meta.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {meta.tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-sky-100 px-2 py-0.5 text-xs text-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {meta.notes.trim() && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200">
          <p className="mb-1 text-[10px] font-medium uppercase text-zinc-500">Notizen</p>
          <p className="whitespace-pre-wrap">{meta.notes}</p>
        </div>
      )}
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Dateien ({meta.files.length})
        </p>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-2 py-1.5 font-medium">Pfad</th>
                <th className="px-2 py-1.5 font-medium">Größe</th>
                <th className="px-2 py-1.5 font-medium">MIME</th>
              </tr>
            </thead>
            <tbody>
              {meta.files.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-3 text-zinc-500">
                    Keine Einträge in meta.files
                  </td>
                </tr>
              ) : (
                meta.files.map((f) => (
                  <tr
                    key={f.path}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="max-w-[240px] truncate px-2 py-1.5 font-mono">{f.path}</td>
                    <td className="px-2 py-1.5 tabular-nums">{formatBytes(f.size)}</td>
                    <td className="px-2 py-1.5 text-zinc-600 dark:text-zinc-400">{f.mime}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ProjectBody({
  workspaceRoot,
  webdavUrl,
}: {
  workspaceRoot: string
  webdavUrl: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 p-4 text-sm text-zinc-800 dark:text-zinc-200">
      <p>
        Dieser Ordner ist ein <strong>R-Base-Workspace</strong> (<code className="text-xs">r-base.project.json</code>
        ).
      </p>
      <p className="text-zinc-600 dark:text-zinc-400">
        Stamm relativ zum fsidx-Index:{' '}
        <span className="font-mono text-xs">{workspaceRoot || '(Stamm)'}</span>
      </p>
      {webdavUrl ? (
        <p className="text-xs text-zinc-500">
          WebDAV (aus Projektdatei): <span className="font-mono">{webdavUrl}</span>
        </p>
      ) : (
        <p className="text-xs text-zinc-500">WebDAV-URL in der Projektdatei nicht gesetzt.</p>
      )}
      <p className="text-xs text-zinc-500">
        Bearbeiten, Sync, Excel und Schema-Konfiguration laufen in der separaten R-Base-App — dort denselben
        lokalen Stammordner wählen wie in fsidx.
      </p>
    </div>
  )
}

export function RBaseViewer({
  fileName,
  filePath,
  onClose,
  showBackButton,
  fillHeight = false,
  indexedPaths,
  rBase,
}: RBaseViewerProps) {
  const locId = rBase.dataset?.locId ?? null
  const datasetFolder = datasetFolderFromMetaPath(filePath)
  const workspaceRoot =
    rBase.workspaceRoot ??
    (rBase.kind === 'project'
      ? workspaceRootFromProjectPath(filePath)
      : rBaseWorkspaceRootFromPath(filePath, indexedPaths))
  const webdavUrl = rBase.project?.settings?.webdav?.baseUrl?.trim() ?? ''

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
        <Database className="h-3 w-3" />
        R-Base · Vorschau
      </span>
      {!rBase.loading && !rBase.error && (
        <>
          <button
            type="button"
            onClick={() => openRBaseOpenTab(filePath)}
            className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            In R-Base öffnen…
          </button>
          <button
            type="button"
            onClick={() => openRBaseApp(locId)}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            R-Base-App
          </button>
        </>
      )}
    </div>
  )

  return (
    <ViewerShell
      title={`R-Base · ${fileName}`}
      subtitle={filePath}
      onClose={onClose}
      showBackButton={showBackButton}
      fillHeight={fillHeight}
      loading={rBase.loading}
      error={rBase.error}
      toolbar={toolbar}
    >
      {!rBase.loading && !rBase.error && rBase.kind === 'dataset' && rBase.dataset && (
        <DatasetBody meta={rBase.dataset} datasetFolder={datasetFolder} />
      )}
      {!rBase.loading && !rBase.error && rBase.kind === 'project' && (
        <ProjectBody workspaceRoot={workspaceRoot ?? ''} webdavUrl={webdavUrl} />
      )}
    </ViewerShell>
  )
}