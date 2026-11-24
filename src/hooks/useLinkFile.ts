import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore } from '../lib/file-sources'
import type { FsidxLinkFile } from '../types/link-file'
import { parseLinkFile } from '../lib/link/link-file'

export function useLinkFile(linkPath: string | null, fileSources: FileSourceStore | null) {
  const [doc, setDoc] = useState<FsidxLinkFile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!linkPath || !fileSources) {
      setDoc(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const text = await readTextFromStore(fileSources, linkPath)
      setDoc(parseLinkFile(text))
    } catch (err) {
      setDoc(null)
      setError(err instanceof Error ? err.message : 'Link-Datei konnte nicht gelesen werden')
    } finally {
      setLoading(false)
    }
  }, [linkPath, fileSources])

  useEffect(() => {
    void reload()
  }, [reload])

  return { doc, loading, error, reload, setDoc }
}