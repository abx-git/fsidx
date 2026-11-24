import { useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readBlobFromStore } from '../lib/file-sources'
import { extensionFromName } from '../lib/mime-hint'
import {
  type OpenDocumentPreview,
  type SpreadsheetPreview,
  isOpenDocumentTextExtension,
  isSpreadsheetExtension,
  parseOpenDocumentBlob,
  parseSpreadsheetBuffer,
} from '../lib/open-document-preview'

export function useSpreadsheetPreview(path: string | null, fileSources: FileSourceStore | null) {
  const [data, setData] = useState<SpreadsheetPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path || !fileSources) {
      setData(null)
      setError(path && !fileSources ? 'Ordner erneut öffnen, um die Datei zu laden.' : null)
      return
    }
    const ext = extensionFromName(path) ?? ''
    if (!isSpreadsheetExtension(ext)) {
      setData(null)
      setError('Keine Tabellendatei.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    readBlobFromStore(fileSources, path)
      .then(async (blob) => {
        const buf = await blob.arrayBuffer()
        if (cancelled) return
        setData(parseSpreadsheetBuffer(buf))
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Tabelle konnte nicht gelesen werden.')
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path, fileSources])

  return { data, loading, error }
}

export function useOpenDocumentPreview(path: string | null, fileSources: FileSourceStore | null) {
  const [data, setData] = useState<OpenDocumentPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path || !fileSources) {
      setData(null)
      setError(path && !fileSources ? 'Ordner erneut öffnen, um die Datei zu laden.' : null)
      return
    }
    const ext = extensionFromName(path) ?? ''
    if (!isOpenDocumentTextExtension(ext)) {
      setData(null)
      setError('Kein unterstütztes OpenDocument-Format.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    readBlobFromStore(fileSources, path)
      .then(async (blob) => {
        if (cancelled) return
        setData(await parseOpenDocumentBlob(blob, ext))
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'OpenDocument konnte nicht gelesen werden.')
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path, fileSources])

  return { data, loading, error }
}