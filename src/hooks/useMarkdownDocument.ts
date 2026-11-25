import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore, writeTextToStore } from '../lib/file-sources'
import { isTaskFilePath, taskIdFromPath } from '../lib/et2/paths'
import { parseTaskMd } from '../lib/et2/parse-task-md'
import { serializeTaskMd } from '../lib/et2/serialize-task-md'
import { useEt2Autosave } from './useEt2Autosave'

/** Vorschau, Quelltext oder geteilte Ansicht (VS Code / Obsidian Quellmodus). */
export type MarkdownViewMode = 'view' | 'edit' | 'split'

const draftCache = new Map<string, string>()

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
  /** Verhindert erneutes Lesen von der Platte bei gleicher Datei (z. B. neues fileSources-Objekt nach Index-Update). */
  const loadedPathRef = useRef<string | null>(null)
  const [content, setContent] = useState('')
  const [viewMode, setViewMode] = useState<MarkdownViewMode>('view')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      loadedPathRef.current = null
      setContent('')
      setError(null)
      setDirty(false)
      setViewMode('view')
      setSaveError(null)
      return
    }

    const cached = draftCache.get(path)
    if (cached != null) {
      loadedPathRef.current = path
      setContent(cached)
      setDirty(true)
      setError(null)
      return
    }

    if (!fileSources) {
      setContent('')
      setError('Re-open the folder to read this file. Imported JSON indexes do not include file contents.')
      setDirty(false)
      setViewMode('view')
      return
    }

    if (loadedPathRef.current === path) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setDirty(false)
    setSaveError(null)

    readTextFromStore(fileSources, path)
      .then((text) => {
        if (cancelled) return
        if (isTaskFilePath(path)) {
          const id = taskIdFromPath(path) ?? path
          const doc = parseTaskMd(text, id)
          setContent(doc.body)
        } else {
          setContent(text)
        }
        loadedPathRef.current = path
        setViewMode('split')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not read file')
        setContent('')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path, fileSources])

  const updateContent = useCallback(
    (next: string) => {
      if (!path) return
      setContent(next)
      setDirty(true)
      draftCache.set(path, next)
    },
    [path],
  )

  const save = useCallback(async (): Promise<{ size: number; lastModified: number } | null> => {
    if (!path || !fileSources) return null
    if (isTaskFilePath(path)) {
      const id = taskIdFromPath(path) ?? path
      const existing = await readTextFromStore(fileSources, path)
      const doc = parseTaskMd(existing, id)
      const text = serializeTaskMd({ frontmatter: doc.frontmatter, body: content })
      await writeTextToStore(fileSources, path, text)
    } else {
      await writeTextToStore(fileSources, path, content)
    }
    draftCache.delete(path)
    setDirty(false)
    const lastModified = Date.now()
    const stats = { size: new Blob([content]).size, lastModified }
    onPersistedRef.current?.(stats)
    return stats
  }, [path, fileSources, content])

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