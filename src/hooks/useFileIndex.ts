import { useCallback, useMemo, useState } from 'react'
import { buildManifestFromRows } from '../lib/build-manifest'
import {
  pickDirectoryWithFsApi,
  rowsFromFileList,
  supportsDirectoryPicker,
} from '../lib/directory-picker'
import type { FileSourceStore } from '../lib/file-sources'
import { resetIdCounter } from '../lib/id'
import { searchEntries } from '../lib/search'
import type { FileIndexManifest, IndexingProgress, IndexNode } from '../types'
import { findNodeByPath, type RawFileRow } from '../lib/build-manifest'
import { appendFileToManifest } from '../lib/manifest-append'
import { sidecarPathForFile } from '../lib/sidecar'

export function useFileIndex() {
  const [manifest, setManifest] = useState<FileIndexManifest | null>(null)
  const [fileSources, setFileSources] = useState<FileSourceStore | null>(null)
  const [progress, setProgress] = useState<IndexingProgress>({
    phase: 'idle',
    scanned: 0,
  })
  const [currentPath, setCurrentPath] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const currentNode = useMemo(() => {
    if (!manifest) return null
    return findNodeByPath(manifest.tree, currentPath)
  }, [manifest, currentPath])

  const searchResults = useMemo(() => {
    if (!manifest || !searchQuery.trim()) return []
    return searchEntries(manifest.entries, { query: searchQuery })
  }, [manifest, searchQuery])

  const indexedFilePaths = useMemo(() => {
    if (!manifest) return new Set<string>()
    return new Set(
      manifest.entries.filter((e) => e.kind === 'file').map((e) => e.path),
    )
  }, [manifest])

  const sidecarPaths = useMemo(() => {
    const set = new Set<string>()
    for (const path of indexedFilePaths) {
      const sidecar = sidecarPathForFile(path)
      if (indexedFilePaths.has(sidecar)) set.add(sidecar)
    }
    return set
  }, [indexedFilePaths])

  const hasSidecar = useCallback(
    (filePath: string) => sidecarPaths.has(sidecarPathForFile(filePath)),
    [sidecarPaths],
  )

  const registerSidecarFile = useCallback((row: RawFileRow) => {
    setManifest((m) => (m ? appendFileToManifest(m, row) : m))
  }, [])

  const selectedNode = useMemo((): IndexNode | null => {
    if (!manifest || !selectedId) return null
    const entry = manifest.entries.find((e) => e.id === selectedId)
    if (!entry) return null
    return findNodeByPath(manifest.tree, entry.path)
  }, [manifest, selectedId])

  const indexFromPicker = useCallback(async () => {
    setProgress({ phase: 'reading', scanned: 0 })
    try {
      const { rootName, rows, fileSources: sources } = await pickDirectoryWithFsApi()
      setProgress({ phase: 'building', scanned: rows.length })
      const built = buildManifestFromRows(rootName, rows)
      setManifest(built)
      setFileSources(sources)
      setCurrentPath('')
      setSelectedId(null)
      setSearchQuery('')
      setProgress({ phase: 'ready', scanned: rows.length })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setProgress({ phase: 'idle', scanned: 0 })
        return
      }
      setProgress({
        phase: 'error',
        scanned: 0,
        message: err instanceof Error ? err.message : 'Folder could not be indexed',
      })
    }
  }, [])

  const indexFromFileList = useCallback((fileList: FileList, rootName: string) => {
    setProgress({ phase: 'building', scanned: fileList.length })
    resetIdCounter()
    const { rows, fileSources: sources } = rowsFromFileList(fileList, rootName)
    const built = buildManifestFromRows(rootName, rows)
    setManifest(built)
    setFileSources(sources)
    setCurrentPath('')
    setSelectedId(null)
    setSearchQuery('')
    setProgress({ phase: 'ready', scanned: rows.length })
  }, [])

  const loadManifestJson = useCallback((json: unknown) => {
    const data = json as FileIndexManifest
    if (data?.version !== 1 || !data.tree || !data.entries) {
      throw new Error('Invalid manifest: expected version 1 with tree and entries')
    }
    setManifest(data)
    setFileSources(null)
    setCurrentPath('')
    setSelectedId(null)
    setSearchQuery('')
    setProgress({ phase: 'ready', scanned: data.entries.length })
  }, [])

  const clearIndex = useCallback(() => {
    setManifest(null)
    setFileSources(null)
    setCurrentPath('')
    setSelectedId(null)
    setSearchQuery('')
    setProgress({ phase: 'idle', scanned: 0 })
  }, [])

  return {
    manifest,
    fileSources,
    progress,
    currentPath,
    setCurrentPath,
    currentNode,
    selectedId,
    setSelectedId,
    selectedNode,
    searchQuery,
    setSearchQuery,
    searchResults,
    indexFromPicker,
    indexFromFileList,
    loadManifestJson,
    clearIndex,
    supportsFsPicker: supportsDirectoryPicker(),
    indexedFilePaths,
    hasSidecar,
    registerSidecarFile,
  }
}