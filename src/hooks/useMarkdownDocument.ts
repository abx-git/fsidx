import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore, writeTextToStore } from '../lib/file-sources'
import { isTaskFilePath, taskIdFromPath } from '../lib/et2/paths'
import { parseTaskMd } from '../lib/et2/parse-task-md'
import { serializeTaskMd } from '../lib/et2/serialize-task-md'
import { useEt2Autosave } from './useEt2Autosave'
import { PREVIEW_LOAD_TIMEOUT_MS, PREVIEW_LOAD_TIMEOUT_MESSAGE } from '../lib/preview-load-timeout'

/** Vorschau, Quelltext oder geteilte Ansicht (VS Code / Obsidian Quellmodus). */
export type MarkdownViewMode = 'view' | 'edit' | 'split'

/** Markdown-Lesen darf länger dauern als Binär-Vorschau; Timeout schließt den Editor nicht. */
const MARKDOWN_LOAD_TIMEOUT_MS = Math.max(PREVIEW_LOAD_TIMEOUT_MS, 120_000)

const draftCache = new Map<string, string>()

const OFFLINE_READ_MESSAGE =
  'Ordner nicht verbunden — Entwurf bleibt im Browser. Ordner erneut öffnen zum Speichern.'
const IMPORTED_INDEX_MESSAGE =
  'Index ohne Datei-Inhalt. Ordner erneut öffnen, um zu lesen und zu speichern.'

export function useMarkdownDocument(
  path: string | null,
  fileSources: FileSourceStore | null,
  options?: {
    autosave?: boolean
    onPersisted?: (stats: { size: number; lastModified: number }) => void
  },
) {
  const onPersistedRef = useRef(options?.onPersisted)
  onPersistedRef.current = options?.onPersisted
  const fileSourcesRef = useRef(fileSources)
  fileSourcesRef.current = fileSources

  /** Verhindert erneutes Lesen von der Platte bei gleicher Datei. */
  const loadedPathRef = useRef<string | null>(null)
  const [content, setContent] = useState('')
  const [viewMode, setViewMode] = useState<MarkdownViewMode>('view')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const restoreDraft = useCallback((targetPath: string) => {
    const cached = draftCache.get(targetPath)
    if (cached == null) return false
    loadedPathRef.current = targetPath
    setContent(cached)
    setDirty(true)
    setError(null)
    setLoading(false)
    return true
  }, [])

  /** Nur `path` löst Platten-Lesen aus — nicht jedes neue fileSources-Objekt (Index-Hintergrund). */
  useEffect(() => {
    if (!path) {
      loadedPathRef.current = null
      setContent('')
      setError(null)
      setDirty(false)
      setViewMode('view')
      setSaveError(null)
      setLoading(false)
      return
    }

    if (restoreDraft(path)) return

    const fs = fileSourcesRef.current
    if (!fs) {
      if (loadedPathRef.current === path) {
        setError(IMPORTED_INDEX_MESSAGE)
        setLoading(false)
        return
      }
      setContent('')
      setError(IMPORTED_INDEX_MESSAGE)
      setDirty(false)
      setLoading(false)
      return
    }

    if (loadedPathRef.current === path) {
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setSaveError(null)

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      cancelled = true
      setLoading(false)
      const draft = draftCache.get(path)
      if (draft != null) {
        setContent(draft)
        setDirty(true)
        loadedPathRef.current = path
        setError('Laden dauert länger — zwischengespeicherter Entwurf wird angezeigt.')
        return
      }
      setError(PREVIEW_LOAD_TIMEOUT_MESSAGE)
    }, MARKDOWN_LOAD_TIMEOUT_MS)

    readTextFromStore(fs, path)
      .then((text) => {
        if (cancelled) return
        const draft = draftCache.get(path)
        if (draft != null) {
          setContent(draft)
          setDirty(true)
        } else if (isTaskFilePath(path)) {
          const id = taskIdFromPath(path) ?? path
          const doc = parseTaskMd(text, id)
          setContent(doc.body)
          setDirty(false)
        } else {
          setContent(text)
          setDirty(false)
        }
        loadedPathRef.current = path
      })
      .catch((err) => {
        if (cancelled) return
        const draft = draftCache.get(path)
        if (draft != null) {
          setContent(draft)
          setDirty(true)
          setError(
            err instanceof Error
              ? `${err.message} — Entwurf aus Zwischenspeicher.`
              : 'Lesen fehlgeschlagen — Entwurf aus Zwischenspeicher.',
          )
          loadedPathRef.current = path
          return
        }
        setError(err instanceof Error ? err.message : 'Could not read file')
        setContent('')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [path, restoreDraft])

  /** Ordner-Verbindung weg — Inhalt/Entwurf nicht löschen. */
  useEffect(() => {
    if (!path || fileSources) {
      if (path && fileSources && error === OFFLINE_READ_MESSAGE) {
        setError(null)
      }
      return
    }
    if (restoreDraft(path) || loadedPathRef.current === path) {
      setError(OFFLINE_READ_MESSAGE)
      setLoading(false)
    }
  }, [path, fileSources, error, restoreDraft])

  const updateContent = useCallback(
    (next: string) => {
      if (!path) return
      setContent(next)
      setDirty(true)
      draftCache.set(path, next)
      setLoading(false)
    },
    [path],
  )

  const save = useCallback(async (): Promise<{ size: number; lastModified: number } | null> => {
    const fs = fileSourcesRef.current
    if (!path || !fs) {
      throw new Error(OFFLINE_READ_MESSAGE)
    }
    if (isTaskFilePath(path)) {
      const id = taskIdFromPath(path) ?? path
      const existing = await readTextFromStore(fs, path)
      const doc = parseTaskMd(existing, id)
      const text = serializeTaskMd({ frontmatter: doc.frontmatter, body: content })
      await writeTextToStore(fs, path, text)
    } else {
      await writeTextToStore(fs, path, content)
    }
    draftCache.delete(path)
    setDirty(false)
    const lastModified = Date.now()
    const stats = { size: new Blob([content]).size, lastModified }
    onPersistedRef.current?.(stats)
    return stats
  }, [path, content])

  const autosave = useCallback(async () => {
    setSaveError(null)
    setSaving(true)
    try {
      await save()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
      throw err
    } finally {
      setSaving(false)
    }
  }, [save])

  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current || !path || !fileSourcesRef.current || !options?.autosave) return
      void save().catch(() => {
        /* page hide — still cached in draftCache */
      })
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [path, save, options?.autosave])

  useEt2Autosave({
    enabled: Boolean(options?.autosave && path && fileSources),
    dirty,
    loading,
    save: autosave,
    debounceMs: 450,
    watch: [content],
  })

  const toggleViewMode = useCallback(() => {
    setViewMode((m) => (m === 'view' ? 'split' : m === 'split' ? 'edit' : 'view'))
  }, [])

  return {
    content,
    updateContent,
    viewMode,
    setViewMode,
    toggleViewMode,
    loading,
    error,
    dirty,
    saving,
    saveError,
    save,
  }
}

export function clearMarkdownDrafts(): void {
  draftCache.clear()
}