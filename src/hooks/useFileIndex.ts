import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildManifestFromRows } from '../lib/build-manifest'
import {
  fileSourcesFromRootHandle,
  pickDirectoryForProgressiveIndex,
  requestDirectoryPermission,
  rowsFromFileList,
  supportsDirectoryPicker,
  walkDirectoryIndexInBackground,
} from '../lib/directory-picker'
import type { FileSourceStore } from '../lib/file-sources'
import { inferVaultRootsFromMarkerEntries, mergeVaultRootLists } from '../lib/vault/vault-paths'
import { reconcileLockedVaultsInManifest } from '../lib/vault/vault-refresh'
import { lockAllVaults } from '../lib/vault/vault-session'
import { resetIdCounter } from '../lib/id'
import { searchEntries } from '../lib/search'
import {
  et2SearchHitToIndexEntry,
  listEt2TaskPathsFromEntries,
  searchEt2Tasks,
} from '../lib/et2/et2-search'
import { isTaskFilePath, isTasksBundlePath } from '../lib/et2/paths'
import { isTskJsonPath } from '../lib/et2/tsk-paths'
import { isEntryInScope } from '../lib/workspace-scope'
import type { FileIndexManifest, IndexEntry, IndexingProgress, IndexNode } from '../types'
import { findNodeByPath, type RawFileRow } from '../lib/build-manifest'
import { rebuildManifestTreeFromEntries } from '../lib/manifest-sync-tree'
import {
  appendFileToManifest,
  appendRowsToManifestEntriesOnly,
} from '../lib/manifest-append'
import { buildManifestIndexes, collectEntriesInScope } from '../lib/manifest-index'
import { entryToShallowNode } from '../lib/manifest-children'
import { refreshScopeFromDisk } from '../lib/scope-refresh'
import { removePathFromManifest } from '../lib/manifest-remove'
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
  const [searchTasksOnly, setSearchTasksOnly] = useState(false)
  const taskTitlesRef = useRef<Map<string, string>>(new Map())
  const [taskTitleGeneration, setTaskTitleGeneration] = useState(0)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backgroundIndexGen = useRef(0)
  const pendingIndexRows = useRef<RawFileRow[]>([])
  const indexFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const manifestIndexes = useMemo(
    () => (manifest ? buildManifestIndexes(manifest.entries) : null),
    [manifest],
  )

  const currentNode = useMemo(() => {
    if (!manifest || !manifestIndexes) return null
    const entry = manifestIndexes.byPath.get(currentPath)
    if (entry?.kind === 'directory') return entryToShallowNode(entry)
    if (entry?.kind === 'file') {
      const parentPath = entry.parentPath
      const parent = manifestIndexes.byPath.get(parentPath)
      return parent ? entryToShallowNode(parent) : manifest.tree
    }
    const legacy = findNodeByPath(manifest.tree, currentPath)
    return legacy
  }, [manifest, manifestIndexes, currentPath])

  const et2TaskHits = useMemo(() => {
    if (!manifest) return []
    return listEt2TaskPathsFromEntries(manifest.entries)
  }, [manifest])

  const registerTaskSearchTitles = useCallback((titles: Map<string, string>) => {
    taskTitlesRef.current = titles
    setTaskTitleGeneration((g) => g + 1)
  }, [])

  const searchResults = useMemo(() => {
    if (!manifest || !searchQuery.trim()) return []
    const scopedEntries = manifestIndexes
      ? collectEntriesInScope(manifestIndexes.byParent, currentPath)
      : manifest.entries.filter((e) => isEntryInScope(e.path, currentPath))
    const scopedEt2Hits = et2TaskHits.filter((h) => isEntryInScope(h.relativePath.split('#')[0], currentPath))
    const et2Hits = searchEt2Tasks(scopedEt2Hits, searchQuery, taskTitlesRef.current)
    const fromTasks = et2Hits.map(et2SearchHitToIndexEntry)

    if (searchTasksOnly) {
      const bundleFiles = searchEntries(
        scopedEntries.filter(
          (e) => e.kind === 'file' && (isTskJsonPath(e.path) || isTasksBundlePath(e.path) || isTaskFilePath(e.path)),
        ),
        { query: searchQuery },
      )
      const seen = new Set(fromTasks.map((e) => e.path.split('#')[0]))
      for (const f of bundleFiles) {
        if (!seen.has(f.path)) {
          fromTasks.push(f)
          seen.add(f.path)
        }
      }
      return fromTasks
    }

    const fileResults = searchEntries(scopedEntries, { query: searchQuery }).filter(
      (e) =>
        !isTaskFilePath(e.path) &&
        !isTasksBundlePath(e.path) &&
        !isTskJsonPath(e.path),
    )
    const seen = new Set<string>()
    const merged: IndexEntry[] = []
    for (const e of [...fromTasks, ...fileResults]) {
      const key = e.path
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(e)
    }
    return merged
  }, [
    manifest,
    manifestIndexes,
    searchQuery,
    et2TaskHits,
    currentPath,
    searchTasksOnly,
    taskTitleGeneration,
  ])

  const indexedFilePaths = useMemo(
    () => manifestIndexes?.filePaths ?? new Set<string>(),
    [manifestIndexes],
  )

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

  const registerSidecarFile = useCallback((row: RawFileRow): string | null => {
    let newId: string | null = null
    setManifest((m) => {
      if (!m) return m
      const updated = appendFileToManifest(m, row)
      newId = updated.entries.find((e) => e.path === row.relativePath)?.id ?? null
      return updated
    })
    return newId
  }, [])

  const removeIndexedPath = useCallback(
    (path: string, kind: 'file' | 'directory'): boolean => {
      let ok = false
      setManifest((m) => {
        if (!m) return m
        const updated = removePathFromManifest(m, path, kind)
        if (!updated) return m
        ok = true
        return updated
      })
      return ok
    },
    [],
  )

  const moveIndexedFile = useCallback(
    (fromPath: string, fileRow: RawFileRow, sidecarRow: RawFileRow | null): string | null => {
      let newId: string | null = null
      setManifest((m) => {
        if (!m) return m
        let updated = removePathFromManifest(m, fromPath, 'file')
        if (!updated) return m
        updated = appendFileToManifest(updated, fileRow)
        newId = updated.entries.find((e) => e.path === fileRow.relativePath)?.id ?? null
        if (sidecarRow) updated = appendFileToManifest(updated, sidecarRow)
        return updated
      })
      return newId
    },
    [],
  )

  const moveIndexedDirectory = useCallback(
    (
      fromDirPath: string,
      newDirPath: string,
      rows: RawFileRow[],
      selectionPath?: string | null,
    ): { newRootId: string | null; selectionId: string | null } => {
      let newRootId: string | null = null
      let selectionId: string | null = null
      setManifest((m) => {
        if (!m) return m
        let updated = removePathFromManifest(m, fromDirPath, 'directory')
        if (!updated) return m
        const sorted = [...rows].sort((a, b) => {
          const da = a.relativePath.split('/').length
          const db = b.relativePath.split('/').length
          if (da !== db) return da - db
          if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
          return a.relativePath.localeCompare(b.relativePath)
        })
        for (const row of sorted) {
          updated = appendFileToManifest(updated, row)
        }
        newRootId = updated.entries.find((e) => e.path === newDirPath)?.id ?? null
        if (selectionPath) {
          const from = fromDirPath.replace(/\\/g, '/')
          const sel = selectionPath.replace(/\\/g, '/')
          if (sel === from || sel.startsWith(`${from}/`)) {
            const remapped =
              sel === from
                ? newDirPath
                : `${newDirPath}/${sel.slice(from.length + 1)}`
            selectionId = updated.entries.find((e) => e.path === remapped)?.id ?? null
          }
        }
        return updated
      })
      return { newRootId, selectionId }
    },
    [],
  )

  const selectedNode = useMemo((): IndexNode | null => {
    if (!manifestIndexes || !selectedId) return null
    const entry = manifestIndexes.byId.get(selectedId)
    if (!entry) return null
    return findNodeByPath(manifest!.tree, entry.path) ?? entryToShallowNode(entry)
  }, [manifest, manifestIndexes, selectedId])

  const persistNow = useCallback(
    (
      m: FileIndexManifest,
      kind: WorkspaceSourceKind | null,
      path: string,
      sel: string | null,
      vaultRoots?: string[],
    ) => {
      if (!kind) return
      void saveWorkspaceSession({
        manifest: m,
        sourceKind: kind,
        currentPath: path,
        selectedId: sel,
        savedAt: new Date().toISOString(),
        vaultRoots,
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
            const vaultRoots = mergeVaultRootLists(
              session.vaultRoots,
              inferVaultRootsFromMarkerEntries(session.manifest.entries.map((e) => e.path)),
            )
            const sources = fileSourcesFromRootHandle(handle, vaultRoots)
            if (!cancelled) {
              lockAllVaults()
              const reconciled = rebuildManifestTreeFromEntries(
                reconcileLockedVaultsInManifest(session.manifest, vaultRoots),
              )
              setManifest(reconciled)
              setFileSources(sources)
              setNeedsFolderReconnect(false)
              setProgress({ phase: 'ready', scanned: reconciled.entries.length })
            }
            return
          }
        }

        if (!cancelled) {
          lockAllVaults()
          const vaultRoots = mergeVaultRootLists(
            session.vaultRoots,
            inferVaultRootsFromMarkerEntries(session.manifest.entries.map((e) => e.path)),
          )
          const reconciled = rebuildManifestTreeFromEntries(
            reconcileLockedVaultsInManifest(session.manifest, vaultRoots),
          )
          setManifest(reconciled)
          setFileSources(null)
          setNeedsFolderReconnect(
            session.sourceKind === 'handles' || session.sourceKind === 'files',
          )
          setProgress({ phase: 'ready', scanned: reconciled.entries.length })
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
    if (progress.phase === 'indexing') return
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      const vaultRoots =
        fileSources?.kind === 'handles' ? fileSources.vaultRoots : undefined
      persistNow(manifest, sourceKind, currentPath, selectedId, vaultRoots)
    }, 400)
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
    }
  }, [manifest, sourceKind, currentPath, selectedId, fileSources, persistNow, progress.phase])

  const indexFromPicker = useCallback(async () => {
    backgroundIndexGen.current += 1
    const runId = backgroundIndexGen.current
    setProgress({ phase: 'reading', scanned: 0, message: 'Ordner wird gewählt…' })
    setNeedsFolderReconnect(false)
    try {
      const { rootName, rootHandle, shallowRows, fileSources: sources } =
        await pickDirectoryForProgressiveIndex()

      lockAllVaults()
      let vaultRoots = mergeVaultRootLists(
        sources.vaultRoots,
        inferVaultRootsFromMarkerEntries(shallowRows.map((r) => r.relativePath)),
      )
      const sourcesWithVaults = { ...sources, vaultRoots } as Extract<
        FileSourceStore,
        { kind: 'handles' }
      > & { vaultRoots: string[] }
      const initial = reconcileLockedVaultsInManifest(
        buildManifestFromRows(rootName, shallowRows),
        vaultRoots,
      )

      setManifest(initial)
      setFileSources(sourcesWithVaults)
      setSourceKind('handles')
      setCurrentPath('')
      setSelectedId(null)
      setSearchQuery('')
      setProgress({
        phase: 'indexing',
        scanned: shallowRows.length,
        message: 'Hintergrund-Index für Suche und Baum…',
      })
      await saveDirectoryHandle(rootHandle)

      void walkDirectoryIndexInBackground(rootHandle, sourcesWithVaults, {
        onProgress: (scanned) => {
          if (runId !== backgroundIndexGen.current) return
          setProgress({
            phase: 'indexing',
            scanned,
            message: 'Hintergrund-Index für Suche und Baum…',
          })
        },
        onBatch: (batch) => {
          if (runId !== backgroundIndexGen.current) return
          pendingIndexRows.current.push(...batch)
          if (indexFlushTimer.current) return
          indexFlushTimer.current = setTimeout(() => {
            indexFlushTimer.current = null
            const chunk = pendingIndexRows.current
            pendingIndexRows.current = []
            if (chunk.length === 0) return
            startTransition(() => {
              setManifest((m) =>
                m ? appendRowsToManifestEntriesOnly(m, chunk) : m,
              )
            })
          }, 350)
        },
        shouldAbort: () => runId !== backgroundIndexGen.current,
      })
        .then((walkVaultRoots) => {
          if (runId !== backgroundIndexGen.current) return
          if (indexFlushTimer.current) {
            clearTimeout(indexFlushTimer.current)
            indexFlushTimer.current = null
          }
          const tail = pendingIndexRows.current
          pendingIndexRows.current = []
          let mergedVaults: string[] = walkVaultRoots
          setManifest((m) => {
            if (!m) return m
            let base = tail.length > 0 ? appendRowsToManifestEntriesOnly(m, tail) : m
            mergedVaults = mergeVaultRootLists(
              walkVaultRoots,
              inferVaultRootsFromMarkerEntries(base.entries.map((e) => e.path)),
            )
            const reconciled = rebuildManifestTreeFromEntries(
              reconcileLockedVaultsInManifest(base, mergedVaults),
            )
            persistNow(reconciled, 'handles', '', null, mergedVaults)
            return reconciled
          })
          setFileSources((fs) =>
            fs?.kind === 'handles' ? { ...fs, vaultRoots: mergedVaults } : fs,
          )
          setProgress((p) => ({
            phase: 'ready',
            scanned: p.scanned,
            message: undefined,
          }))
        })
        .catch((err) => {
          if (runId !== backgroundIndexGen.current) return
          if (err instanceof DOMException && err.name === 'AbortError') return
          setProgress({
            phase: 'error',
            scanned: 0,
            message:
              err instanceof Error ? err.message : 'Hintergrund-Index fehlgeschlagen',
          })
        })
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
        lockAllVaults()
        if (manifest) {
          const vaultRoots = mergeVaultRootLists(
            inferVaultRootsFromMarkerEntries(manifest.entries.map((e) => e.path)),
          )
          const sources = fileSourcesFromRootHandle(handle, vaultRoots)
          const reconciled = rebuildManifestTreeFromEntries(
            reconcileLockedVaultsInManifest(manifest, vaultRoots),
          )
          setManifest(reconciled)
          setProgress({ phase: 'ready', scanned: reconciled.entries.length })
          setFileSources(sources)
        } else {
          setProgress({ phase: 'ready', scanned: 0 })
          setFileSources(fileSourcesFromRootHandle(handle))
        }
        setSourceKind('handles')
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
    backgroundIndexGen.current += 1
    lockAllVaults()
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

  const replaceManifest = useCallback((next: FileIndexManifest) => {
    setManifest(next)
  }, [])

  const refreshCurrentScope = useCallback(async (): Promise<boolean> => {
    if (!manifest || !fileSources) return false
    const next = await refreshScopeFromDisk(manifest, currentPath, fileSources)
    if (!next) return false
    setManifest(next)
    return true
  }, [manifest, fileSources, currentPath])

  return {
    manifest,
    manifestIndexes,
    fileSources,
    setFileSources,
    replaceManifest,
    progress,
    currentPath,
    setCurrentPath,
    currentNode,
    selectedId,
    setSelectedId,
    selectedNode,
    searchQuery,
    setSearchQuery,
    searchTasksOnly,
    setSearchTasksOnly,
    registerTaskSearchTitles,
    searchResults,
    indexFromPicker,
    indexFromFileList,
    loadManifestJson,
    clearIndex,
    supportsFsPicker: supportsDirectoryPicker(),
    indexedFilePaths,
    hasSidecar,
    registerSidecarFile,
    removeIndexedPath,
    moveIndexedFile,
    moveIndexedDirectory,
    sessionReady,
    needsFolderReconnect,
    reconnectLastFolder,
    refreshCurrentScope,
  }
}