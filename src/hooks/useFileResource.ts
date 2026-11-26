import { useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readBlobFromStore, readTextFromStore } from '../lib/file-sources'
import { PREVIEW_LOAD_TIMEOUT_MS, PREVIEW_LOAD_TIMEOUT_MESSAGE } from '../lib/preview-load-timeout'

export function useFileBlob(path: string | null, fileSources: FileSourceStore | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path || !fileSources) {
      setObjectUrl(null)
      setBlob(null)
      setError(path && !fileSources ? 'Ordner erneut öffnen, um die Datei zu laden.' : null)
      return
    }

    let cancelled = false
    let url: string | null = null
    setLoading(true)
    setError(null)

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      cancelled = true
      setLoading(false)
      setError(PREVIEW_LOAD_TIMEOUT_MESSAGE)
      setBlob(null)
      setObjectUrl(null)
    }, PREVIEW_LOAD_TIMEOUT_MS)

    readBlobFromStore(fileSources, path)
      .then((b) => {
        if (cancelled) return
        setBlob(b)
        url = URL.createObjectURL(b)
        setObjectUrl(url)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Datei konnte nicht geladen werden.')
        setBlob(null)
        setObjectUrl(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      if (url) URL.revokeObjectURL(url)
    }
  }, [path, fileSources])

  return { objectUrl, blob, loading, error }
}

export function useFileText(path: string | null, fileSources: FileSourceStore | null) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path || !fileSources) {
      setText('')
      setError(path && !fileSources ? 'Ordner erneut öffnen.' : null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      cancelled = true
      setLoading(false)
      setError(PREVIEW_LOAD_TIMEOUT_MESSAGE)
      setText('')
    }, PREVIEW_LOAD_TIMEOUT_MS)

    readTextFromStore(fileSources, path)
      .then((t) => {
        if (!cancelled) setText(t)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Lesen fehlgeschlagen')
          setText('')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [path, fileSources])

  return { text, loading, error }
}