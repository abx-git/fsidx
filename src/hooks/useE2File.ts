import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore } from '../lib/file-sources'
import { isE2BoardSnapshotText } from '../lib/e2/e2-board-paths'
import { PREVIEW_LOAD_TIMEOUT_MS, PREVIEW_LOAD_TIMEOUT_MESSAGE } from '../lib/preview-load-timeout'

export function useE2File(e2Path: string | null, fileSources: FileSourceStore | null) {
  const [json, setJson] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!e2Path || !fileSources) {
      setJson('')
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      cancelled = true
      setJson('')
      setError(PREVIEW_LOAD_TIMEOUT_MESSAGE)
      setLoading(false)
    }, PREVIEW_LOAD_TIMEOUT_MS)
    try {
      const text = await readTextFromStore(fileSources, e2Path)
      if (cancelled) return
      if (!isE2BoardSnapshotText(text)) {
        throw new Error('Kein gültiges E2-Board in der Datei.')
      }
      setJson(text)
    } catch (err) {
      if (cancelled) return
      setJson('')
      setError(err instanceof Error ? err.message : 'E2-Board konnte nicht gelesen werden.')
    } finally {
      clearTimeout(timeoutId)
      if (!cancelled) setLoading(false)
    }
  }, [e2Path, fileSources])

  useEffect(() => {
    void reload()
  }, [reload])

  return { json, setJson, loading, error, reload }
}