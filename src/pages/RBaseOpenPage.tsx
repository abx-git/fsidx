import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Database, ExternalLink, Loader2 } from 'lucide-react'
import {
  normalizeRBaseOpenPathParam,
  openRBaseApp,
  RBASE_APP_ORIGIN,
  RBASE_PENDING_LOC_STORAGE_KEY,
} from '../lib/r-base/r-base-app-link'
import {
  datasetFolderFromMetaPath,
  isRBaseProjectConfigPath,
  workspaceRootFromProjectPath,
} from '../lib/r-base/r-base-paths'
import { useRBaseFile } from '../hooks/useRBaseFile'
import {
  fileSourcesFromRootHandle,
  requestDirectoryPermission,
} from '../lib/directory-picker'
import type { FileSourceStore } from '../lib/file-sources'
import { loadDirectoryHandle, loadWorkspaceSession } from '../lib/workspace-persist'

export function RBaseOpenPage() {
  const targetPath = useMemo(
    () => normalizeRBaseOpenPathParam(new URLSearchParams(window.location.search).get('path')),
    [],
  )

  const [fileSources, setFileSources] = useState<FileSourceStore | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [booting, setBooting] = useState(true)

  const rBase = useRBaseFile(targetPath, fileSources)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!targetPath) {
        setBootError('Ungültiger oder fehlender ?path= (meta.json oder r-base.project.json).')
        setBooting(false)
        return
      }
      try {
        const session = await loadWorkspaceSession()
        const handle = await loadDirectoryHandle()
        if (
          !session ||
          !handle ||
          session.sourceKind !== 'handles' ||
          !(await requestDirectoryPermission(handle))
        ) {
          if (!cancelled) {
            setBootError(
              'Workspace nicht verbunden. Zuerst fsidx öffnen und denselben Ordner wählen (gleicher Browser).',
            )
          }
          return
        }
        if (!cancelled) setFileSources(fileSourcesFromRootHandle(handle))
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : 'Workspace konnte nicht geladen werden.')
        }
      } finally {
        if (!cancelled) setBooting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [targetPath])

  const locId = rBase.dataset?.locId ?? null
  const workspaceHint = targetPath
    ? isRBaseProjectConfigPath(targetPath)
      ? workspaceRootFromProjectPath(targetPath)
      : datasetFolderFromMetaPath(targetPath)
    : ''

  const handleOpenApp = () => {
    openRBaseApp(locId)
  }

  const backHref = (import.meta.env.BASE_URL as string) || '/'

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-zinc-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Workspace verbinden…
      </div>
    )
  }

  if (bootError) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="mb-4 text-red-700 dark:text-red-400">{bootError}</p>
        <a href={backHref} className="text-sm text-sky-700 underline dark:text-sky-300">
          Zurück zu fsidx
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <a
          href={backHref}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
        >
          <ArrowLeft className="h-4 w-4" />
          fsidx
        </a>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-sky-700 dark:text-sky-400" />
          <h1 className="text-lg font-semibold">R-Base</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-6">
        {rBase.loading && (
          <p className="flex items-center gap-2 text-zinc-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            meta.json wird geladen…
          </p>
        )}
        {rBase.error && <p className="text-red-700 dark:text-red-400">{rBase.error}</p>}

        {!rBase.loading && !rBase.error && rBase.kind === 'dataset' && rBase.dataset && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs uppercase text-zinc-500">Datensatz</p>
            <p className="font-mono text-lg">{rBase.dataset.locId}</p>
            <p className="mt-1 text-zinc-800 dark:text-zinc-200">
              {rBase.dataset.bezeichnung || 'Ohne Bezeichnung'}
            </p>
            <p className="mt-2 font-mono text-xs text-zinc-500">{targetPath}</p>
          </div>
        )}

        {!rBase.loading && !rBase.error && rBase.kind === 'project' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs uppercase text-zinc-500">R-Base-Workspace</p>
            <p className="font-mono text-sm">{targetPath}</p>
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-900 dark:bg-sky-950/30">
      <p>
        Die R-Base-App läuft separat unter{' '}
        <a
          href={RBASE_APP_ORIGIN}
          className="font-mono text-xs text-sky-800 underline dark:text-sky-300"
          target="_blank"
          rel="noreferrer"
        >
          {RBASE_APP_ORIGIN}
        </a>
        . Wähle dort <strong>denselben lokalen Stammordner</strong> wie in fsidx (Chrome/Edge, gleicher
        Browser).
      </p>
      {workspaceHint && (
        <p className="text-zinc-700 dark:text-zinc-300">
          R-Base-Stamm relativ zum fsidx-Index:{' '}
          <code className="rounded bg-white/80 px-1 font-mono text-xs dark:bg-zinc-900">
            {workspaceHint || '(Workspace-Root)'}
          </code>
        </p>
      )}
      {locId && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Loc-ID <span className="font-mono">{locId}</span> wird in <code>sessionStorage</code> unter{' '}
          <code>{RBASE_PENDING_LOC_STORAGE_KEY}</code> hinterlegt — für eine künftige Deep-Link-Unterstützung
          in R-Base.
        </p>
      )}
      <button
        type="button"
        onClick={handleOpenApp}
        className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
      >
        <ExternalLink className="h-4 w-4" />
        R-Base-App öffnen
      </button>
        </div>
      </main>
    </div>
  )
}