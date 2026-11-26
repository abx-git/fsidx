import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, PenLine, Save } from 'lucide-react'
import { E2Embed, type E2EmbedHandle } from '../components/e2/E2Embed'
import { useE2File } from '../hooks/useE2File'
import { normalizeE2EditorPathParam } from '../lib/e2/e2-editor-tab'
import { postE2Saved } from '../lib/e2/e2-save-broadcast'
import {
  fileSourcesFromRootHandle,
  requestDirectoryPermission,
} from '../lib/directory-picker'
import type { FileSourceStore } from '../lib/file-sources'
import { canWriteToStore, writeTextToStore } from '../lib/file-sources'
import { loadDirectoryHandle, loadWorkspaceSession } from '../lib/workspace-persist'

export function E2EditPage() {
  const targetPath = useMemo(
    () => normalizeE2EditorPathParam(new URLSearchParams(window.location.search).get('path')),
    [],
  )
  const targetPathRef = useRef(targetPath)
  targetPathRef.current = targetPath

  const [fileSources, setFileSources] = useState<FileSourceStore | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [booting, setBooting] = useState(true)

  const e2 = useE2File(targetPath, fileSources)
  const embedRef = useRef<E2EmbedHandle>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const canWrite = canWriteToStore(fileSources)
  const fileName = targetPath?.split('/').pop() ?? 'Board.e2.json'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!targetPath) {
        setBootError('Ungültiger oder fehlender ?path= (nur .e2.json im Workspace).')
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

  const persistJson = useCallback(
    async (json: string) => {
      const path = targetPathRef.current
      if (!path || !fileSources || !canWrite) return
      await writeTextToStore(fileSources, path, json)
      postE2Saved(path)
    },
    [fileSources, canWrite],
  )

  const handleJsonChange = useCallback(
    (json: string, hostFileId: string, reason: 'autosave' | 'flush') => {
      const path = targetPathRef.current
      if (!path || hostFileId !== path || !canWrite) return
      if (reason === 'flush') e2.setJson(json)
      setSaveError(null)
      const save = () => {
        void (async () => {
          setSaving(true)
          try {
            await persistJson(json)
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
          } finally {
            setSaving(false)
          }
        })()
      }
      if (reason === 'flush') {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        save()
        return
      }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(save, 700)
    },
    [canWrite, e2, persistJson],
  )

  useEffect(() => {
    const flush = () => embedRef.current?.requestFlush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const homeUrl = (import.meta.env.BASE_URL as string) || '/'

  return (
    <div className="fsidx-app-shell flex h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-900 dark:text-violet-200">
            <PenLine className="h-4 w-4" />
            E2 bearbeiten
          </p>
          <p className="truncate font-mono text-[11px] text-zinc-500" title={targetPath ?? undefined}>
            {targetPath ?? '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saving && (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Speichern…
            </span>
          )}
          {canWrite && !booting && !bootError && !e2.loading && !e2.error && (
            <button
              type="button"
              onClick={() => embedRef.current?.requestFlush()}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
            >
              <Save className="h-3.5 w-3.5" />
              Speichern
            </button>
          )}
          <a
            href={homeUrl}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            fsidx
          </a>
        </div>
      </header>

      {saveError && (
        <p className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {saveError}
        </p>
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!targetPath || bootError ? (
          <p className="m-4 text-sm text-red-700 dark:text-red-300">{bootError ?? 'Kein Ziel.'}</p>
        ) : booting || e2.loading ? (
          <p className="flex flex-1 items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {fileName} wird geladen…
          </p>
        ) : e2.error ? (
          <p className="m-4 text-sm text-red-700 dark:text-red-300">{e2.error}</p>
        ) : !canWrite ? (
          <p className="m-4 text-sm text-zinc-600">Nur Lesen — Ordner ohne Schreibrechte.</p>
        ) : (
          <E2Embed
            ref={embedRef}
            hostFileId={targetPath}
            json={e2.json}
            canWrite
            onJsonChange={handleJsonChange}
            className="min-h-0 flex-1"
          />
        )}
      </main>
    </div>
  )
}