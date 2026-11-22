import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildManifestFromRows } from '../lib/build-manifest'
import {
  fileSourcesFromDirectoryHandle,
  pickDirectoryWithFsApi,
  requestDirectoryPermission,
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
import {
  clearWorkspaceStorage,
  loadDirectoryHandle,
  loadWorkspaceSession,
  saveDirectoryHandle,
  saveWorkspaceSession,
  type WorkspaceSourceKind,
} from '../lib/workspace-persist'

function applySessionUi(
  session: {
    manifest: FileIndexManifest
    currentPath: string
    selectedId: string | null
  },
  setters: {
    setManifest: (m: FileIndexManifest) => void
    setCurrentPath: (p: string) => void
    setSelectedId: (id: string | null) => void
    setSearchQuery: (q: string) => void
  },
) {
  setters.setManifest(session.manifest)
  setters.setCurrentPath(session.currentPath ?? '')
  setters.setSelectedId(session.selectedId ?? null)
  setters.setSearchQuery('')
}

export function useFileIndex() {
  const [manifest, setManifest] = useState<FileIndexManifest | null>(null)
  const [fileSources, setFileSources] = useState<FileSourceStore | null>(null)
  const [sourceKind, setSourceKind] = useState<WorkspaceSourceKind | null>(null)
  const [needsFolderReconnect, setNeedsFolderReconnect] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [progress, setProgress] = useState<IndexingProgress>({
    phase: 'idle',
    scanned: 0,
  })
  const [currentPath, setCurrentPath] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const persistNow = useCallback(
    (m: FileIndexManifest, kind: WorkspaceSourceKind | null, path: string, sel: string | null) => {
      if (!kind) return
      void saveWorkspaceSession({
        manifest: m,
        sourceKind: kind,
        currentPath: path,
        selectedId: sel,
        savedAt: new Date().toISOString(),
      })
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    const setters = { setManifest, setCurrentPath, setSelectedId, setSearchQuery }

    ;(async () => {
      setProgress({ phase: 'reading', scanned: 0, message: 'Letzte Sitzung wird geladen…' })
      try {
        const session = await loadWorkspaceSession()
        if (cancelled || !session) {
          setProgress({ phase: 'idle', scanned: 0 })
          return
        }

        setSourceKind(session.sourceKind)
        applySessionUi(session, setters)

        if (session.sourceKind === 'handles') {
          const handle = await loadDirectoryHandle()
          if (
            handle &&
            handle.name === session.manifest.rootName &&
            (await requestDirectoryPermission(handle))
          ) {
            const sources = await fileSourcesFromDirectoryHandle(handle)
            if (!cancelled) {
              setFileSources(sources)
              setNeedsFolderReconnect(false)
              setProgress({ phase: 'ready', scanned: session.manifest.entries.length })
            }
            return
          }
        }

        if (!cancelled) {
          setFileSources(null)
          setNeedsFolderReconnect(
            session.sourceKind === 'handles' || session.sourceKind === 'files',
          )
          setProgress({ phase: 'ready', scanned: session.manifest.entries.length })
        }
      } catch (err) {
        if (!cancelled) {
          setProgress({
            phase: 'error',
            scanned: 0,
            message:
              err instanceof Error ? err.message : 'Wiederherstellung der Sitzung fehlgeschlagen',
          })
        }
      } finally {
        if (!cancelled) setSessionReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!manifest || !sourceKind) return
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      persistNow(manifest, sourceKind, currentPath, selectedId)
    }, 400)
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
    }
  }, [manifest, sourceKind, currentPath, selectedId, persistNow])

  const indexFromPicker = useCallback(async () => {
    setProgress({ phase: 'reading', scanned: 0 })
    setNeedsFolderReconnect(false)
    try {
      const { rootName, rows, fileSources: sources, rootHandle } = await pickDirectoryWithFsApi()
      setProgress({ phase: 'building', scanned: rows.length })
      const built = buildManifestFromRows(rootName, rows)
      setManifest(built)
      setFileSources(sources)
      setSourceKind('handles')
      setCurrentPath('')
      setSelectedId(null)
      setSearchQuery('')
      setProgress({ phase: 'ready', scanned: rows.length })
      await saveDirectoryHandle(rootHandle)
      persistNow(built, 'handles', '', null)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setProgress((p) => (p.phase === 'reading' ? { phase: 'idle', scanned: 0 } : p))
        return
      }
      setProgress({
        phase: 'error',
        scanned: 0,
        message: err instanceof Error ? err.message : 'Folder could not be indexed',
      })
    }
  }, [persistNow])

  const indexFromFileList = useCallback(
    (fileList: FileList, rootName: string) => {
      setProgress({ phase: 'building', scanned: fileList.length })
      setNeedsFolderReconnect(false)
      resetIdCounter()
      const { rows, fileSources: sources } = rowsFromFileList(fileList, rootName)
      const built = buildManifestFromRows(rootName, rows)
      setManifest(built)
      setFileSources(sources)
      setSourceKind('files')
      setCurrentPath('')
      setSelectedId(null)
      setSearchQuery('')
      setProgress({ phase: 'ready', scanned: rows.length })
      void clearWorkspaceStorage().then(() => persistNow(built, 'files', '', null))
    },
    [persistNow],
  )

  const loadManifestJson = useCallback(
    (json: unknown) => {
      const data = json as FileIndexManifest
      if (data?.version !== 1 || !data.tree || !data.entries) {
        throw new Error('Invalid manifest: expected version 1 with tree and entries')
      }
      setManifest(data)
      setFileSources(null)
      setSourceKind('import')
      setNeedsFolderReconnect(false)
      setCurrentPath('')
      setSelectedId(null)
      setSearchQuery('')
      setProgress({ phase: 'ready', scanned: data.entries.length })
      void clearWorkspaceStorage().then(() => persistNow(data, 'import', '', null))
    },
    [persistNow],
  )

  const reconnectLastFolder = useCallback(async () => {
    setNeedsFolderReconnect(false)
    setProgress({ phase: 'reading', scanned: 0 })
    try {
      const handle = await loadDirectoryHandle()
      if (
        handle &&
        manifest &&
        handle.name === manifest.rootName &&
        (await requestDirectoryPermission(handle))
      ) {
        const sources = await fileSourcesFromDirectoryHandle(handle)
        setFileSources(sources)
        setSourceKind('handles')
        setProgress({ phase: 'ready', scanned: manifest.entries.length })
        return
      }
      if (supportsDirectoryPicker()) {
        await indexFromPicker()
        return
      }
      setNeedsFolderReconnect(true)
      setProgress({ phase: 'ready', scanned: manifest?.entries.length ?? 0 })
    } catch (err) {
      setNeedsFolderReconnect(true)
      setProgress({
        phase: 'error',
        scanned: 0,
        message: err instanceof Error ? err.message : 'Verbindung zum Ordner fehlgeschlagen',
      })
    }
  }, [indexFromPicker, manifest])

  const clearIndex = useCallback(() => {
    setManifest(null)
    setFileSources(null)
    setSourceKind(null)
    setNeedsFolderReconnect(false)
    setCurrentPath('')
    setSelectedId(null)
    setSearchQuery('')
    setProgress({ phase: 'idle', scanned: 0 })
    void clearWorkspaceStorage()
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
    sessionReady,
    needsFolderReconnect,
    reconnectLastFolder,
  }
}