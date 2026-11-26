import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore } from '../lib/file-sources'
import { isDrawioSource } from '../lib/drawio'
import { PREVIEW_LOAD_TIMEOUT_MS, PREVIEW_LOAD_TIMEOUT_MESSAGE } from '../lib/preview-load-timeout'

export function useDrawioFile(drawioPath: string | null, fileSources: FileSourceStore | null) {
  const [xml, setXml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!drawioPath || !fileSources) {
      setXml('')
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      cancelled = true
      setXml('')
      setError(PREVIEW_LOAD_TIMEOUT_MESSAGE)
      setLoading(false)
    }, PREVIEW_LOAD_TIMEOUT_MS)
    try {
      const text = await readTextFromStore(fileSources, drawioPath)
      if (cancelled) return
      if (!isDrawioSource(text)) {
        throw new Error('Kein gültiges draw.io-XML in der Datei.')
      }
      setXml(text)
    } catch (err) {
      if (cancelled) return
      setXml('')
      setError(err instanceof Error ? err.message : 'Diagramm konnte nicht gelesen werden')
    } finally {
      clearTimeout(timeoutId)
      if (!cancelled) setLoading(false)
    }
  }, [drawioPath, fileSources])

  useEffect(() => {
    void reload()
  }, [reload])

  return { xml, setXml, loading, error, reload }
}