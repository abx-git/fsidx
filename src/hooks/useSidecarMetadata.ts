import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore, writeTextToStore } from '../lib/file-sources'
import {
  createDefaultFileMetadata,
  parseFileMetadata,
  serializeFileMetadata,
  sidecarPathForFile,
} from '../lib/sidecar'
import type { FileMetadataV1 } from '../types/file-metadata'

const draftCache = new Map<string, FileMetadataV1>()

export type MetadataViewMode = 'form' | 'source'

export function useSidecarMetadata(
  targetFilePath: string | null,
  targetFileName: string,
  fileSources: FileSourceStore | null,
  sidecarExists: boolean,
) {
  const [data, setData] = useState<FileMetadataV1 | null>(null)
  const [viewMode, setViewMode] = useState<MetadataViewMode>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [isNew, setIsNew] = useState(false)

  const sidecarPath = targetFilePath ? sidecarPathForFile(targetFilePath) : null

  useEffect(() => {
    if (!targetFilePath || !sidecarPath) {
      setData(null)
      setError(null)
      setDirty(false)
      setIsNew(false)
      return
    }

    const cached = draftCache.get(sidecarPath)
    if (cached) {
      setData(cached)
      setDirty(true)
      setViewMode('form')
      return
    }

    if (!sidecarExists) {
      const created = createDefaultFileMetadata(targetFilePath, targetFileName)
      setData(created)
      setIsNew(true)
      setDirty(true)
      setError(null)
      setViewMode('form')
      return
    }

    if (!fileSources) {
      setError('Ordner erneut öffnen, um Metadaten zu laden.')
      setData(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setIsNew(false)

    readTextFromStore(fileSources, sidecarPath)
      .then((text) => {
        if (cancelled) return
        setData(parseFileMetadata(JSON.parse(text)))
        setDirty(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Metadaten konnten nicht gelesen werden.')
        setData(createDefaultFileMetadata(targetFilePath, targetFileName))
        setIsNew(true)
        setDirty(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [targetFilePath, targetFileName, sidecarPath, sidecarExists, fileSources])

  const updateData = useCallback(
    (next: FileMetadataV1) => {
      if (!sidecarPath) return
      setData(next)
      setDirty(true)
      draftCache.set(sidecarPath, next)
    },
    [sidecarPath],
  )

  const save = useCallback(async (): Promise<{ size: number; lastModified: number } | null> => {
    if (!data || !sidecarPath || !fileSources) return null
    const text = serializeFileMetadata(data)
    try {
      await writeTextToStore(fileSources, sidecarPath, text)
      draftCache.delete(sidecarPath)
      setDirty(false)
      setIsNew(false)
      const blob = new Blob([text])
      return { size: blob.size, lastModified: Date.now() }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Speichern fehlgeschlagen')
    }
  }, [data, sidecarPath, fileSources])

  const download = useCallback(() => {
    if (!data || !sidecarPath) return
    const blob = new Blob([serializeFileMetadata(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = sidecarPath.split('/').pop() ?? 'metadata.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [data, sidecarPath])

  return {
    sidecarPath,
    data,
    updateData,
    viewMode,
    setViewMode,
    loading,
    error,
    dirty,
    isNew,
    save,
    download,
  }
}

export function clearSidecarDrafts(): void {
  draftCache.clear()
}