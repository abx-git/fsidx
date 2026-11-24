import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore } from '../lib/file-sources'
import { isDrawioSource } from '../lib/drawio'

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
    try {
      const text = await readTextFromStore(fileSources, drawioPath)
      if (!isDrawioSource(text)) {
        throw new Error('Kein gültiges draw.io-XML in der Datei.')
      }
      setXml(text)
    } catch (err) {
      setXml('')
      setError(err instanceof Error ? err.message : 'Diagramm konnte nicht gelesen werden')
    } finally {
      setLoading(false)
    }
  }, [drawioPath, fileSources])

  useEffect(() => {
    void reload()
  }, [reload])

  return { xml, setXml, loading, error, reload }
}