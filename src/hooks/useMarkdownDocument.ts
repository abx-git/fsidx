import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore, writeTextToStore } from '../lib/file-sources'

export type MarkdownViewMode = 'live' | 'source'

const draftCache = new Map<string, string>()

export function useMarkdownDocument(
  path: string | null,
  fileSources: FileSourceStore | null,
) {
  const [content, setContent] = useState('')
  const [viewMode, setViewMode] = useState<MarkdownViewMode>('live')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!path) {
      setContent('')
      setError(null)
      setDirty(false)
      setViewMode('live')
      return
    }

    const cached = draftCache.get(path)
    if (cached != null) {
      setContent(cached)
      setDirty(true)
      setViewMode('live')
      setError(null)
      return
    }

    if (!fileSources) {
      setContent('')
      setError('Re-open the folder to read this file. Imported JSON indexes do not include file contents.')
      setDirty(false)
      setViewMode('live')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setViewMode('live')
    setDirty(false)

    readTextFromStore(fileSources, path)
      .then((text) => {
        if (cancelled) return
        setContent(text)
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

  const toggleViewMode = useCallback(() => {
    setViewMode((m) => (m === 'live' ? 'source' : 'live'))
  }, [])

  const save = useCallback(async (): Promise<{ size: number; lastModified: number } | null> => {
    if (!path || !fileSources) return null
    await writeTextToStore(fileSources, path, content)
    draftCache.delete(path)
    setDirty(false)
    const lastModified = Date.now()
    return { size: new Blob([content]).size, lastModified }
  }, [path, fileSources, content])

  return {
    content,
    updateContent,
    viewMode,
    setViewMode,
    toggleViewMode,
    loading,
    error,
    dirty,
    save,
  }
}

export function clearMarkdownDrafts(): void {
  draftCache.clear()
}