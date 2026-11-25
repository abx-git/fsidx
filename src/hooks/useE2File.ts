import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore } from '../lib/file-sources'
import { isE2BoardSnapshotText } from '../lib/e2/e2-board-paths'

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
    try {
      const text = await readTextFromStore(fileSources, e2Path)
      if (!isE2BoardSnapshotText(text)) {
        throw new Error('Kein gültiges E2-Board in der Datei.')
      }
      setJson(text)
    } catch (err) {
      setJson('')
      setError(err instanceof Error ? err.message : 'E2-Board konnte nicht gelesen werden.')
    } finally {
      setLoading(false)
    }
  }, [e2Path, fileSources])

  useEffect(() => {
    void reload()
  }, [reload])

  return { json, setJson, loading, error, reload }
}