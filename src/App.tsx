import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findNodeByPath, type RawFileRow } from './lib/build-manifest'
import { defaultViewerForFile, type FileViewerKind } from './lib/file-viewers'
import {
  DIRECTORY_README_NAME,
  buildDefaultDirectoryReadme,
  directoryReadmePath,
} from './lib/directory-readme'
import { canWriteToStore, writeTextToStore } from './lib/file-sources'
import { isSidecarForIndexedFile, sidecarPathForFile } from './lib/sidecar'
import { Header } from './components/Header'
import { TskDetailPanel } from './components/et2/TskDetailPanel'
import { Et2AggregateTaskPanel } from './components/et2/Et2AggregateTaskPanel'
import { Et2NewTaskDialog } from './components/et2/Et2NewTaskDialog'
import { Et2MigrateDialog } from './components/et2/Et2MigrateDialog'
import { createEt2TaskOnDisk } from './lib/et2/create-task'
import {
  deleteEt2TaskFromBundle,
  indentEt2Task,
  moveEt2TaskSibling,
  nestEt2TaskUnder,
  reorderEt2TaskRelative,
  outdentEt2Task,
  reparentEt2Task,
} from './lib/et2/tasks-bundle'
import { DEFAULT_NEW_TASK_TITLE } from './lib/et2/constants'
import { Et2ReparentDialog } from './components/et2/Et2ReparentDialog'
import { createDirectoryInScope, createMarkdownInScope } from './lib/create-workspace'
import { readClipboardAsFile } from './lib/clipboard-paste'
import { rangeSelectIds } from './lib/list-selection'
import { uploadFilesToScope } from './lib/upload-files-scope'
import { createVaultFolderInScope } from './lib/vault/create-vault-folder'
import { closeVaultInSession, unlockVaultAndMergeIndex } from './lib/vault/vault-refresh'
import { lockAllVaults } from './lib/vault/vault-session'
import { VaultUnlockDialog } from './components/vault/VaultUnlockDialog'
import { deletePathFromStore } from './lib/delete-workspace'
import {
  moveDirectoryInStore,
  moveFileInStore,
  normalizeRenameFileNameInput,
  pathIsUnderDir,
  remapSubtreePath,
  renameFileInStore,
  resolveMoveFilePath,
} from './lib/move-workspace'
import { isTskJsonPath, normalizeTskJsonFileNameInput } from './lib/et2/tsk-paths'
import {
  isBundledTaskRef,
  isTaskFilePath,
  makeBundledTaskRef,
  taskRefFromPath,
} from './lib/et2/paths'
import { workspaceHasLegacyEt2 } from './lib/et2/is-et2-internal'
import { buildEt2TaskCountIndex } from './lib/et2/scan-folder-tasks'
import { sanitizeScopePath } from './lib/scope-sanitize'
import { LegacyTaskNotice } from './components/et2/LegacyTaskNotice'
import { taskContainerDir } from './lib/workspace-scope'
import { looksLikeOpaqueId } from './lib/et2/display-title'
import { useEt2TaskSummaries } from './hooks/useEt2TaskSummaries'
import { useEt2TaskEditor } from './hooks/useEt2TaskEditor'
import { useEt2Autosave } from './hooks/useEt2Autosave'
import { useTskFile } from './hooks/useTskFile'
import { useLinkFile } from './hooks/useLinkFile'
import { LinkDetailPanel } from './components/link/LinkDetailPanel'
import { DrawioDetailPanel } from './components/drawio/DrawioDetailPanel'
import { E2DetailPanel } from './components/e2/E2DetailPanel'
import { isLinkJsonPath } from './lib/link/link-paths'
import { isDrawioPath } from './lib/drawio'
import { createDrawioInScope } from './lib/drawio/create-drawio'
import { useDrawioFile } from './hooks/useDrawioFile'
import { isE2JsonPath } from './lib/e2/e2-board-paths'
import { createE2BoardInScope } from './lib/e2/create-e2-board'
import { useE2File } from './hooks/useE2File'
import {
  createNewLinkFile,
  normalizeLinkUrl,
  writeLinkFileToStore,
} from './lib/link/link-file'
import type { FsidxLinkFile } from './types/link-file'
import { TreeNav } from './components/TreeNav'
import { FileBrowser } from './components/FileBrowser'
import { DetailPanel } from './components/DetailPanel'
import { Welcome } from './components/Welcome'
import { MetadataEditor } from './components/MetadataEditor'
import { FileViewerRouter } from './components/viewers/FileViewerRouter'
import {
  FileContextMenu,
  type ContextMenuTarget,
} from './components/FileContextMenu'
import { useFileIndex } from './hooks/useFileIndex'
import { useViewerPanelPinned } from './hooks/useViewerPanelPinned'
import { useDetailMetadataVisible } from './hooks/useDetailMetadataVisible'
import { useViewerSidebarLayout } from './hooks/useViewerSidebarLayout'
import { clearMarkdownDrafts, useMarkdownDocument } from './hooks/useMarkdownDocument'
import { clearSidecarDrafts, useSidecarMetadata } from './hooks/useSidecarMetadata'
import { WorkspaceConnectionBanner } from './components/WorkspaceConnectionBanner'
import { formatScopeLabel, getWorkspaceConnectionState } from './lib/workspace-connection'

function App() {
  const fallbackInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [fileView, setFileView] = useState<{
    viewer: FileViewerKind
    path: string
    name: string
    id: string
    size?: number
  } | null>(null)
  const [metadataTarget, setMetadataTarget] = useState<{
    path: string
    name: string
    id: string
  } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showEt2DotFiles, setShowEt2DotFiles] = useState(false)
  const [et2MigrateOpen, setEt2MigrateOpen] = useState(false)
  const [selectedTskTaskRef, setSelectedTskTaskRef] = useState<string | null>(null)
  const [newEt2TaskRequest, setNewEt2TaskRequest] = useState<{ dirPath: string } | null>(null)
  const [reparentTaskId, setReparentTaskId] = useState<string | null>(null)
  const [titleFocusTick, setTitleFocusTick] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const selectionAnchorRef = useRef<string | null>(null)

  const {
    manifest,
    fileSources,
    progress,
    currentPath,
    setCurrentPath,
    currentNode,
    selectedId,
    setSelectedId: setSelectedIdRaw,
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
    supportsFsPicker,
    indexedFilePaths,
    hasSidecar,
    registerSidecarFile,
    removeIndexedPath,
    moveIndexedFile,
    moveIndexedDirectory,
    sessionReady,
    needsFolderReconnect,
    reconnectLastFolder,
    setFileSources,
    replaceManifest,
  } = useFileIndex()

  const setSelectedId = useCallback(
    (id: string | null) => {
      setSelectedIdRaw(id)
      setSelectedIds(id ? new Set([id]) : new Set())
      if (id) selectionAnchorRef.current = id
    },
    [setSelectedIdRaw],
  )

  const applyListSelection = useCallback(
    (ids: Set<string>, primary: string) => {
      setSelectedIds(ids)
      setSelectedIdRaw(primary)
      selectionAnchorRef.current = primary
    },
    [setSelectedIdRaw],
  )

  const [vaultUnlockTarget, setVaultUnlockTarget] = useState<string | null>(null)
  const [vaultUiTick, setVaultUiTick] = useState(0)
  void vaultUiTick

  const { pinned: viewerPinned, setPinned: setViewerPinned } = useViewerPanelPinned()
  const { visible: detailMetadataVisible, setVisible: setDetailMetadataVisible } =
    useDetailMetadataVisible()
  const {
    widthPx: sidebarWidthPx,
    setWidthPx: setSidebarWidthPx,
    minWidth: sidebarMinWidth,
    maxWidth: sidebarMaxWidth,
    maxWidthDrawio,
    maxWidthForDrawio,
  } = useViewerSidebarLayout()
  const [drawioDetailFullscreen, setDrawioDetailFullscreen] = useState(false)
  const [drawioSaving, setDrawioSaving] = useState(false)
  const [drawioSaveError, setDrawioSaveError] = useState<string | null>(null)
  const drawioSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [e2DetailFullscreen, setE2DetailFullscreen] = useState(false)
  const [e2Saving, setE2Saving] = useState(false)
  const [e2SaveError, setE2SaveError] = useState<string | null>(null)
  const e2SaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!viewerPinned || metadataTarget) return
    if (!selectedNode || selectedNode.kind !== 'file') {
      setFileView(null)
      return
    }
    if (isE2JsonPath(selectedNode.path)) {
      if (viewerPinned) {
        setFileView((prev) => {
          if (
            prev?.id === selectedNode.id &&
            prev.path === selectedNode.path &&
            prev.viewer === 'e2-board'
          ) {
            return prev
          }
          return {
            viewer: 'e2-board',
            path: selectedNode.path,
            name: selectedNode.name,
            id: selectedNode.id,
            size: selectedNode.size,
          }
        })
      } else {
        setFileView(null)
      }
      return
    }
    if (
      isTskJsonPath(selectedNode.path) ||
      isTaskFilePath(selectedNode.path) ||
      isDrawioPath(selectedNode.path)
    ) {
      setFileView(null)
      return
    }
    const kind = defaultViewerForFile(selectedNode.path, selectedNode.extension)
    setFileView((prev) => {
      if (
        prev?.id === selectedNode.id &&
        prev.path === selectedNode.path &&
        prev.viewer === kind
      ) {
        return prev
      }
      return {
        viewer: kind,
        path: selectedNode.path,
        name: selectedNode.name,
        id: selectedNode.id,
        size: selectedNode.size,
      }
    })
  }, [viewerPinned, selectedNode, metadataTarget])

  const sidecarExists = metadataTarget
    ? hasSidecar(metadataTarget.path)
    : false

  const sidecar = useSidecarMetadata(
    metadataTarget?.path ?? null,
    metadataTarget?.name ?? '',
    fileSources,
    sidecarExists,
  )

  const canWrite = canWriteToStore(fileSources)
  const connectionState = getWorkspaceConnectionState(fileSources)

  const markdownOnPersisted = useCallback(
    (stats: { size: number; lastModified: number }) => {
      if (fileView?.viewer !== 'markdown') return
      const name = fileView.path.split('/').pop() ?? fileView.name
      registerSidecarFile({
        relativePath: fileView.path,
        name,
        kind: 'file',
        size: stats.size,
        lastModified: stats.lastModified,
      })
    },
    [fileView, registerSidecarFile],
  )

  const markdown = useMarkdownDocument(
    fileView?.viewer === 'markdown' ? fileView.path : null,
    fileSources,
    { autosave: canWrite, onPersisted: markdownOnPersisted },
  )

  const indexedPathList = useMemo(
    () => (manifest ? manifest.entries.filter((e) => e.kind === 'file').map((e) => e.path) : []),
    [manifest],
  )

  const et2TaskCountByDir = useMemo(
    () => buildEt2TaskCountIndex(indexedPathList),
    [indexedPathList],
  )

  const hasLegacyEt2 = useMemo(
    () => (manifest ? workspaceHasLegacyEt2(manifest.entries.map((e) => e.path)) : false),
    [manifest],
  )

  useEffect(() => {
    if (!hasLegacyEt2) setShowEt2DotFiles(false)
  }, [hasLegacyEt2])

  const [aggregateTasksDir, setAggregateTasksDir] = useState<string | null>(null)

  const et2Tasks = useEt2TaskSummaries(indexedPathList, currentPath, fileSources)
  const aggregateEt2Tasks = useEt2TaskSummaries(
    indexedPathList,
    aggregateTasksDir ?? currentPath,
    fileSources,
    aggregateTasksDir !== null,
  )

  useEffect(() => {
    const titles = new Map<string, string>()
    for (const t of et2Tasks.tasks) titles.set(t.relativePath, t.title)
    registerTaskSearchTitles(titles)
  }, [et2Tasks.tasks, registerTaskSearchTitles])

  const activeTskPath = useMemo(() => {
    if (selectedNode?.kind !== 'file' || !isTskJsonPath(selectedNode.path)) return null
    return selectedNode.path
  }, [selectedNode])

  const activeLinkPath = useMemo(() => {
    if (selectedNode?.kind !== 'file' || !isLinkJsonPath(selectedNode.path)) return null
    return selectedNode.path
  }, [selectedNode])

  const activeDrawioPath = useMemo(() => {
    if (selectedNode?.kind !== 'file' || !isDrawioPath(selectedNode.path)) return null
    return selectedNode.path
  }, [selectedNode])

  const activeE2Path = useMemo(() => {
    if (selectedNode?.kind !== 'file' || !isE2JsonPath(selectedNode.path)) return null
    return selectedNode.path
  }, [selectedNode])

  const isLegacyTaskFile = useMemo(
    () => selectedNode?.kind === 'file' && isTaskFilePath(selectedNode.path),
    [selectedNode],
  )

  const tskFile = useTskFile(activeTskPath, fileSources)
  const linkFile = useLinkFile(activeLinkPath, fileSources)
  const drawioFile = useDrawioFile(activeDrawioPath, fileSources)
  const e2File = useE2File(activeE2Path, fileSources)
  const [linkDraft, setLinkDraft] = useState<FsidxLinkFile | null>(null)
  const [linkSaving, setLinkSaving] = useState(false)
  const [linkSaveError, setLinkSaveError] = useState<string | null>(null)
  const et2TaskEditor = useEt2TaskEditor(selectedTskTaskRef, fileSources)

  useEffect(() => {
    if (linkFile.doc) setLinkDraft(linkFile.doc)
    else setLinkDraft(null)
    setLinkSaveError(null)
  }, [linkFile.doc, activeLinkPath])

  useEffect(() => {
    if (!activeTskPath) {
      setSelectedTskTaskRef(null)
      return
    }
    if (!selectedTskTaskRef || !selectedTskTaskRef.startsWith(`${activeTskPath}#`)) {
      const first = tskFile.tasks[0]
      setSelectedTskTaskRef(first?.relativePath ?? null)
    }
  }, [activeTskPath, tskFile.tasks, selectedTskTaskRef])

  const fileViewTarget = useMemo(() => {
    if (!fileView) return null
    if (fileView.viewer === 'markdown' && fileView.path.includes('/.et2/tasks/')) {
      const fromList = et2Tasks.tasks.find((t) => t.relativePath === fileView.path)
      if (fromList) return { ...fileView, name: fromList.title }
      if (looksLikeOpaqueId(fileView.name)) {
        return { ...fileView, name: 'Aufgabe' }
      }
    }
    if (fileView.viewer === 'markdown' && looksLikeOpaqueId(fileView.name)) {
      return { ...fileView, name: markdown.content.slice(0, 40) || 'Markdown' }
    }
    if (fileView.viewer === 'link' && linkDraft && fileView.path === activeLinkPath) {
      return { ...fileView, name: linkDraft.title }
    }
    return fileView
  }, [fileView, et2Tasks.tasks, markdown.content, linkDraft, activeLinkPath])


  const inspectNode = useMemo(() => {
    if (!manifest) return null
    return selectedNode ?? currentNode ?? manifest.tree
  }, [manifest, selectedNode, currentNode])

  const navigateToPath = useCallback(
    (path: string, selectId?: string | null) => {
      setCurrentPath(sanitizeScopePath(path, showEt2DotFiles))
      setSearchQuery('')
      setMetadataTarget(null)
      setSaveError(null)
      setFileView(null)
      if (selectId !== undefined) setSelectedId(selectId)
    },
    [setCurrentPath, setSearchQuery, setSelectedId, showEt2DotFiles],
  )

  useEffect(() => {
    const next = sanitizeScopePath(currentPath, showEt2DotFiles)
    if (next !== currentPath) setCurrentPath(next)
  }, [currentPath, showEt2DotFiles, setCurrentPath])

  useEffect(() => {
    if (!manifest || currentPath === '') return
    if (!findNodeByPath(manifest.tree, currentPath)) {
      setCurrentPath('')
      setSelectedId(null)
    }
  }, [manifest, currentPath, setCurrentPath, setSelectedId])

  const jsonPreview = useMemo(() => {
    if (!manifest) return ''
    const target = inspectNode ?? manifest.tree
    const slice =
      target === manifest.tree
        ? {
            version: manifest.version,
            indexedAt: manifest.indexedAt,
            rootName: manifest.rootName,
            stats: manifest.stats,
          }
        : target
    return JSON.stringify(slice, null, 2)
  }, [manifest, inspectNode])

  const handleSelectEntry = useCallback(
    (id: string, event?: React.MouseEvent, orderedIds?: string[]) => {
      const toggle = Boolean(event && (event.ctrlKey || event.metaKey))
      const shift = Boolean(event?.shiftKey)
      if (toggle && manifest) {
        setSelectedIds((prev) => {
          const next = new Set<string>(
            prev.size > 0 ? [...prev] : selectedId ? [selectedId] : [],
          )
          if (next.has(id)) next.delete(id)
          else next.add(id)
          setSelectedIdRaw(id)
          selectionAnchorRef.current = id
          return next
        })
        return
      }
      if (shift && selectionAnchorRef.current && orderedIds?.length) {
        applyListSelection(rangeSelectIds(orderedIds, selectionAnchorRef.current, id), id)
        return
      }
      if (!manifest) {
        setSelectedId(id)
        return
      }
      const fromSearch = searchResults.find((e) => e.id === id)
      const entry =
        fromSearch ?? manifest.entries.find((e) => e.id === id) ?? null
      if (!entry) {
        setSelectedId(id)
        return
      }
      const ref = taskRefFromPath(entry.path)
      if (ref) {
        const bundleEntry = manifest.entries.find((e) => e.path === ref.bundlePath)
        const dirPath = ref.bundlePath.includes('/')
          ? ref.bundlePath.slice(0, ref.bundlePath.lastIndexOf('/'))
          : ''
        navigateToPath(dirPath, bundleEntry?.id ?? null)
        setSelectedTskTaskRef(makeBundledTaskRef(ref.bundlePath, ref.taskId))
        setSearchQuery('')
        return
      }
      setSelectedId(id)
    },
    [
      manifest,
      searchResults,
      setSelectedId,
      setSelectedIdRaw,
      applyListSelection,
      selectedId,
      setSearchQuery,
      navigateToPath,
    ],
  )

  const handleOpenTaskFromAggregate = useCallback(
    (taskRef: string, bundlePath: string) => {
      if (!manifest) return
      const bundleEntry = manifest.entries.find((e) => e.path === bundlePath)
      const dirPath = bundlePath.includes('/')
        ? bundlePath.slice(0, bundlePath.lastIndexOf('/'))
        : ''
      navigateToPath(dirPath, bundleEntry?.id ?? null)
      const ref = taskRefFromPath(taskRef)
      if (ref) setSelectedTskTaskRef(makeBundledTaskRef(ref.bundlePath, ref.taskId))
      else if (isBundledTaskRef(taskRef)) setSelectedTskTaskRef(taskRef)
    },
    [manifest, navigateToPath],
  )

  const openViewer = useCallback(
    (
      viewer: FileViewerKind,
      path: string,
      name: string,
      id: string,
      size?: number,
    ) => {
      setMetadataTarget(null)
      setSelectedId(id)
      setFileView({ viewer, path, name, id, size })
      setSearchQuery('')
    },
    [setSelectedId, setSearchQuery],
  )

  const markdownEditorProps = useMemo(
    () =>
      fileView?.viewer === 'markdown'
        ? {
            content: markdown.content,
            updateContent: markdown.updateContent,
            viewMode: markdown.viewMode,
            setViewMode: markdown.setViewMode,
            loading: markdown.loading,
            error: markdown.error,
            canWrite,
            saving: markdown.saving,
            saveError: markdown.saveError,
          }
        : null,
    [fileView?.viewer, markdown, canWrite],
  )

  const handleDirectoryReadme = useCallback(
    async (dirPath: string, dirId: string) => {
      if (!manifest) return
      const dirNode = findNodeByPath(manifest.tree, dirPath)
      if (!dirNode || dirNode.kind !== 'directory') return

      const mdPath = directoryReadmePath(dirPath)
      const existing = manifest.entries.find((e) => e.path === mdPath)
      let entryId = existing?.id ?? dirId

      if (!existing) {
        if (!fileSources || !canWrite) {
          window.alert(
            'README.md anlegen: Ordner mit Chrome/Edge öffnen (Schreibzugriff). Alternativ nur per Download.',
          )
          return
        }
        const body = buildDefaultDirectoryReadme(dirNode, manifest.rootName)
        await writeTextToStore(fileSources, mdPath, body)
        const lastModified = Date.now()
        const size = new Blob([body]).size
        const id = registerSidecarFile({
          relativePath: mdPath,
          name: DIRECTORY_README_NAME,
          kind: 'file',
          size,
          lastModified,
        })
        entryId = id ?? entryId
        clearMarkdownDrafts()
      }

      setMetadataTarget(null)
      openViewer('markdown', mdPath, DIRECTORY_README_NAME, entryId, existing?.size)
    },
    [manifest, fileSources, canWrite, registerSidecarFile, openViewer],
  )

  const openMetadata = useCallback((path: string, name: string, id: string) => {
    setFileView(null)
    setMetadataTarget({ path, name, id })
    setSelectedId(id)
    setSearchQuery('')
    setSaveError(null)
  }, [setSelectedId, setSearchQuery])

  const onFallbackChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return
      const first = files[0] as File & { webkitRelativePath?: string }
      const rootName = first.webkitRelativePath?.split('/')[0] ?? 'Selected folder'
      clearMarkdownDrafts()
      clearSidecarDrafts()
      setFileView(null)
      setMetadataTarget(null)
      indexFromFileList(files, rootName)
      e.target.value = ''
    },
    [indexFromFileList],
  )

  const onImportJson = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          clearMarkdownDrafts()
          clearSidecarDrafts()
          setFileView(null)
          setMetadataTarget(null)
          loadManifestJson(JSON.parse(String(reader.result)))
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Invalid JSON file')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [loadManifestJson],
  )

  const handleClear = useCallback(() => {
    clearMarkdownDrafts()
    clearSidecarDrafts()
    setFileView(null)
    setMetadataTarget(null)
    lockAllVaults()
    setVaultUnlockTarget(null)
    clearIndex()
  }, [clearIndex])

  const handleOpenFolder = useCallback(async () => {
    clearMarkdownDrafts()
    clearSidecarDrafts()
    setFileView(null)
    setMetadataTarget(null)
    await indexFromPicker()
  }, [indexFromPicker])

  const handleNewFolder = useCallback(
    async (parentPath: string) => {
      if (!fileSources || !canWrite) {
        window.alert('Ordner anlegen: Chrome/Edge mit Schreibzugriff.')
        return
      }
      const name = window.prompt('Name des neuen Ordners:', 'Neuer Ordner')
      if (name === null || !name.trim()) return
      try {
        const { relativePath, row } = await createDirectoryInScope(fileSources, parentPath, name)
        registerSidecarFile(row)
        navigateToPath(relativePath, null)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Ordner konnte nicht angelegt werden')
      }
    },
    [fileSources, canWrite, registerSidecarFile, navigateToPath],
  )

  const handleNewVaultFolder = useCallback(
    async (parentPath: string) => {
      if (!fileSources || !canWrite) {
        window.alert('Tresor anlegen: Chrome/Edge mit Schreibzugriff.')
        return
      }
      const name = window.prompt('Name des Tresors:', 'Tresor')
      if (name === null || !name.trim()) return
      try {
        const { rows, vaultRoot } = await createVaultFolderInScope(fileSources, parentPath, name)
        for (const row of rows) registerSidecarFile(row)
        setFileSources((prev) => {
          if (!prev) return prev
          const roots = new Set(prev.vaultRoots ?? [])
          roots.add(vaultRoot)
          return { ...prev, vaultRoots: [...roots] }
        })
        navigateToPath(vaultRoot, null)
        setVaultUnlockTarget(vaultRoot)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Tresor konnte nicht angelegt werden')
      }
    },
    [fileSources, canWrite, registerSidecarFile, navigateToPath, setFileSources],
  )

  const handleVaultUnlock = useCallback(
    async (key: CryptoKey) => {
      if (!fileSources || !manifest || !vaultUnlockTarget) return
      const { manifest: next, skippedEntries } = await unlockVaultAndMergeIndex(
        fileSources,
        manifest,
        vaultUnlockTarget,
        key,
      )
      replaceManifest(next)
      setVaultUiTick((t) => t + 1)
      if (skippedEntries > 0) {
        window.alert(
          `${skippedEntries} Eintrag/Einträge konnten nicht entschlüsselt werden (falscher Schlüssel oder keine Vault-Datei).`,
        )
      }
    },
    [fileSources, manifest, vaultUnlockTarget, replaceManifest],
  )

  const handleVaultLock = useCallback(
    (vaultRoot: string) => {
      if (!manifest) return
      const next = closeVaultInSession(fileSources, manifest, vaultRoot)
      replaceManifest(next)
      setVaultUiTick((t) => t + 1)
      if (selectedId && !next.entries.some((e) => e.id === selectedId)) {
        setSelectedId(null)
      }
    },
    [fileSources, manifest, replaceManifest, selectedId, setSelectedId],
  )

  const handleSaveLinkFile = useCallback(async () => {
    if (!activeLinkPath || !fileSources || !linkDraft || !canWrite) return
    setLinkSaving(true)
    setLinkSaveError(null)
    try {
      const { row } = await writeLinkFileToStore(fileSources, activeLinkPath, linkDraft)
      registerSidecarFile(row)
      await linkFile.reload()
      if (fileView?.path === activeLinkPath) {
        setFileView((prev) =>
          prev ? { ...prev, name: linkDraft.title, size: row.size } : prev,
        )
      }
    } catch (err) {
      setLinkSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setLinkSaving(false)
    }
  }, [
    activeLinkPath,
    fileSources,
    linkDraft,
    canWrite,
    registerSidecarFile,
    linkFile,
    fileView?.path,
  ])

  const sidebarMaxWidthEffective = useMemo(() => {
    if (typeof window === 'undefined') return sidebarMaxWidth
    const vwCap = Math.floor(window.innerWidth * 0.92)
    const hiCap = activeDrawioPath || activeE2Path ? maxWidthForDrawio() : vwCap
    return Math.min(maxWidthDrawio, Math.max(sidebarMinWidth, hiCap))
  }, [activeDrawioPath, activeE2Path, maxWidthDrawio, maxWidthForDrawio, sidebarMaxWidth, sidebarMinWidth])

  const handleSidebarResizeLive = useCallback(
    (width: number) => {
      setSidebarWidthPx(width, sidebarMaxWidthEffective, { persist: false })
    },
    [setSidebarWidthPx, sidebarMaxWidthEffective],
  )

  const handleSidebarResizeCommit = useCallback(
    (width: number) => {
      setSidebarWidthPx(width, sidebarMaxWidthEffective)
    },
    [setSidebarWidthPx, sidebarMaxWidthEffective],
  )

  const handleWidenDrawioPanel = useCallback(() => {
    const target = Math.min(
      maxWidthForDrawio(),
      Math.max(sidebarWidthPx, Math.floor(window.innerWidth * 0.72)),
    )
    setSidebarWidthPx(target, maxWidthForDrawio())
  }, [maxWidthForDrawio, setSidebarWidthPx, sidebarWidthPx])

  useEffect(() => {
    if (!activeDrawioPath) setDrawioDetailFullscreen(false)
  }, [activeDrawioPath])

  useEffect(() => {
    if (!activeE2Path) setE2DetailFullscreen(false)
  }, [activeE2Path])

  useEffect(() => {
    if (!drawioDetailFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawioDetailFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [drawioDetailFullscreen])

  useEffect(() => {
    if (!e2DetailFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setE2DetailFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [e2DetailFullscreen])

  const persistDrawioXml = useCallback(
    async (xml: string, drawioPath: string) => {
      if (!fileSources || !canWrite) return
      const name = drawioPath.split('/').pop() ?? drawioPath
      await writeTextToStore(fileSources, drawioPath, xml)
      registerSidecarFile({
        relativePath: drawioPath,
        name,
        kind: 'file',
        size: new Blob([xml]).size,
        lastModified: Date.now(),
      })
    },
    [fileSources, canWrite, registerSidecarFile],
  )

  const handleDrawioXmlChange = useCallback(
    (xml: string) => {
      if (!activeDrawioPath || !canWrite) return
      drawioFile.setXml(xml)
      setDrawioSaveError(null)
      if (drawioSaveTimerRef.current) clearTimeout(drawioSaveTimerRef.current)
      drawioSaveTimerRef.current = setTimeout(() => {
        void (async () => {
          setDrawioSaving(true)
          try {
            await persistDrawioXml(xml, activeDrawioPath)
          } catch (err) {
            setDrawioSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
          } finally {
            setDrawioSaving(false)
          }
        })()
      }, 700)
    },
    [activeDrawioPath, canWrite, drawioFile, persistDrawioXml],
  )

  const persistE2Json = useCallback(
    async (json: string, e2Path: string) => {
      if (!fileSources || !canWrite) return
      const name = e2Path.split('/').pop() ?? e2Path
      await writeTextToStore(fileSources, e2Path, json)
      registerSidecarFile({
        relativePath: e2Path,
        name,
        kind: 'file',
        size: new Blob([json]).size,
        lastModified: Date.now(),
      })
    },
    [fileSources, canWrite, registerSidecarFile],
  )

  const e2EditingPath = activeE2Path ?? (fileView?.viewer === 'e2-board' ? fileView.path : null)

  const handleE2JsonChange = useCallback(
    (json: string, hostFileId: string, reason: 'autosave' | 'flush' = 'autosave') => {
      if (!e2EditingPath || !canWrite || hostFileId !== e2EditingPath) return
      if (reason === 'flush') e2File.setJson(json)
      setE2SaveError(null)
      const save = () => {
        void (async () => {
          setE2Saving(true)
          try {
            await persistE2Json(json, e2EditingPath)
          } catch (err) {
            setE2SaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
          } finally {
            setE2Saving(false)
          }
        })()
      }
      if (reason === 'flush') {
        if (e2SaveTimerRef.current) clearTimeout(e2SaveTimerRef.current)
        save()
        return
      }
      if (e2SaveTimerRef.current) clearTimeout(e2SaveTimerRef.current)
      e2SaveTimerRef.current = setTimeout(save, 700)
    },
    [e2EditingPath, canWrite, e2File, persistE2Json],
  )

  const e2BoardViewerProps = useMemo(
    () =>
      fileView?.viewer === 'e2-board' && e2EditingPath === fileView.path
        ? {
            json: e2File.json,
            loading: e2File.loading,
            error: e2File.error,
            canWrite,
            saving: e2Saving,
            saveError: e2SaveError,
            onJsonChange: handleE2JsonChange,
          }
        : null,
    [
      fileView?.viewer,
      fileView?.path,
      e2EditingPath,
      e2File.json,
      e2File.loading,
      e2File.error,
      canWrite,
      e2Saving,
      e2SaveError,
      handleE2JsonChange,
    ],
  )

  const handleNewDrawioFile = useCallback(
    async (parentPath: string) => {
      if (!fileSources || !canWrite) {
        window.alert('Diagramm anlegen: Chrome/Edge mit Schreibzugriff.')
        return
      }
      const nameInput = window.prompt('Dateiname:', 'Diagramm.drawio')
      if (nameInput === null) return
      try {
        const { row } = await createDrawioInScope(
          fileSources,
          parentPath,
          nameInput.trim() || undefined,
          indexedPathList,
        )
        const newId = registerSidecarFile(row)
        navigateToPath(parentPath, null)
        const widen = Math.min(
          maxWidthForDrawio(),
          Math.max(sidebarWidthPx, 720, Math.floor(window.innerWidth * 0.55)),
        )
        setSidebarWidthPx(widen, maxWidthForDrawio())
        if (newId) handleSelectEntry(newId)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Diagramm konnte nicht angelegt werden')
      }
    },
    [
      fileSources,
      canWrite,
      indexedPathList,
      registerSidecarFile,
      navigateToPath,
      handleSelectEntry,
      maxWidthForDrawio,
      setSidebarWidthPx,
      sidebarWidthPx,
    ],
  )

  const handleNewE2Board = useCallback(
    async (parentPath: string) => {
      if (!fileSources || !canWrite) {
        window.alert('E2-Board anlegen: Chrome/Edge mit Schreibzugriff.')
        return
      }
      const nameInput = window.prompt('Dateiname:', 'Board.e2.json')
      if (nameInput === null) return
      try {
        const { row } = await createE2BoardInScope(
          fileSources,
          parentPath,
          nameInput.trim() || undefined,
          indexedPathList,
        )
        const newId = registerSidecarFile(row)
        navigateToPath(parentPath, null)
        const widen = Math.min(
          maxWidthForDrawio(),
          Math.max(sidebarWidthPx, 720, Math.floor(window.innerWidth * 0.55)),
        )
        setSidebarWidthPx(widen, maxWidthForDrawio())
        if (newId) {
          handleSelectEntry(newId)
          openViewer('e2-board', row.relativePath, row.name, newId, row.size)
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'E2-Board konnte nicht angelegt werden')
      }
    },
    [
      fileSources,
      canWrite,
      indexedPathList,
      registerSidecarFile,
      navigateToPath,
      handleSelectEntry,
      maxWidthForDrawio,
      setSidebarWidthPx,
      sidebarWidthPx,
      openViewer,
    ],
  )

  const handleNewLinkFile = useCallback(
    async (parentPath: string) => {
      if (!fileSources || !canWrite) {
        window.alert('Link anlegen: Chrome/Edge mit Schreibzugriff.')
        return
      }
      const urlInput = window.prompt('Ziel-URL (https://…):')
      if (urlInput === null || !urlInput.trim()) return
      try {
        const url = normalizeLinkUrl(urlInput)
        const defaultTitle = (() => {
          try {
            return new URL(url).hostname
          } catch {
            return 'Link'
          }
        })()
        const titleInput = window.prompt('Titel:', defaultTitle)
        if (titleInput === null) return
        const { linkPath, row } = await createNewLinkFile(fileSources, parentPath, {
          url,
          title: titleInput.trim() || defaultTitle,
          indexedPaths: indexedPathList,
        })
        const newId = registerSidecarFile(row)
        navigateToPath(parentPath, null)
        if (newId) {
          handleSelectEntry(newId)
          openViewer('link', linkPath, row.name, newId, row.size)
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Link konnte nicht angelegt werden')
      }
    },
    [
      fileSources,
      canWrite,
      indexedPathList,
      registerSidecarFile,
      navigateToPath,
      handleSelectEntry,
      openViewer,
    ],
  )

  const handleUploadFilesToScope = useCallback(
    async (scopePath: string, files: File[]) => {
      if (!fileSources || !canWrite) {
        window.alert('Dateien ablegen: Chrome/Edge mit Schreibzugriff auf den Workspace-Ordner.')
        return
      }
      try {
        const rows = await uploadFilesToScope(fileSources, scopePath, files)
        for (const row of rows) registerSidecarFile(row)
        if (rows.some((r) => isTskJsonPath(r.relativePath))) et2Tasks.reload()
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Dateien konnten nicht abgelegt werden')
      }
    },
    [fileSources, canWrite, registerSidecarFile, et2Tasks],
  )

  const handlePasteFromClipboard = useCallback(
    async (parentPath: string) => {
      if (!fileSources || !canWrite) {
        window.alert('Einfügen: Chrome/Edge mit Schreibzugriff auf den Workspace-Ordner.')
        return
      }
      if (!manifest) return
      const existingNames = new Set(
        manifest.entries
          .filter((e) => e.kind === 'file' && e.parentPath === parentPath)
          .map((e) => e.name),
      )
      try {
        const file = await readClipboardAsFile(existingNames)
        if (!file) {
          window.alert('Zwischenablage: kein Text oder Bild gefunden.')
          return
        }
        const rows = await uploadFilesToScope(fileSources, parentPath, [file])
        const row = rows[0]
        if (!row) return
        const id = registerSidecarFile(row)
        if (id) {
          const kind = defaultViewerForFile(row.relativePath, row.name.split('.').pop())
          openViewer(kind, row.relativePath, row.name, id, row.size)
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Einfügen aus Zwischenablage fehlgeschlagen')
      }
    },
    [fileSources, canWrite, manifest, registerSidecarFile, openViewer],
  )

  const handleNewMarkdown = useCallback(
    async (parentPath: string) => {
      if (!fileSources || !canWrite) {
        window.alert('Datei anlegen: Chrome/Edge mit Schreibzugriff.')
        return
      }
      const name = window.prompt('Dateiname:', 'notiz.md')
      if (name === null || !name.trim()) return
      try {
        const { relativePath, row } = await createMarkdownInScope(fileSources, parentPath, name)
        const id = registerSidecarFile(row)
        clearMarkdownDrafts()
        if (id) {
          openViewer('markdown', relativePath, row.name, id, row.size)
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Markdown konnte nicht angelegt werden')
      }
    },
    [fileSources, canWrite, registerSidecarFile, openViewer],
  )

  const pickNextTaskRefAfterDelete = useCallback(
    (removedIds: string[]) => {
      const remaining = tskFile.tasks.filter((t) => !removedIds.includes(t.taskId))
      if (remaining.length === 0) {
        setSelectedTskTaskRef(null)
        return
      }
      const current = selectedTskTaskRef ? taskRefFromPath(selectedTskTaskRef) : null
      if (current && removedIds.includes(current.taskId)) {
        const deleted = tskFile.tasks.find((t) => t.taskId === current.taskId)
        const sibling = remaining.find(
          (t) => (t.parentId ?? null) === (deleted?.parentId ?? null) && t.taskId !== current.taskId,
        )
        const parent = deleted?.parentId
          ? remaining.find((t) => t.taskId === deleted.parentId)
          : null
        setSelectedTskTaskRef((sibling ?? parent ?? remaining[0]).relativePath)
      }
    },
    [tskFile.tasks, selectedTskTaskRef],
  )

  const handleEt2SiblingAfter = useCallback(
    async (anchorTaskId: string) => {
      if (!activeTskPath || !fileSources || !canWrite) {
        window.alert('Neue Aufgabe: .tsk.json mit Schreibzugriff öffnen.')
        return
      }
      const parentDir = activeTskPath.includes('/')
        ? activeTskPath.slice(0, activeTskPath.lastIndexOf('/'))
        : ''
      try {
        const result = await createEt2TaskOnDisk(fileSources, {
          dirPath: parentDir,
          tskPath: activeTskPath,
          title: '',
          body: '',
          insertAfterTaskId: anchorTaskId,
          indexedPaths: indexedPathList,
        })
        registerSidecarFile(result.row)
        clearMarkdownDrafts()
        et2Tasks.reload()
        await tskFile.reload()
        setSelectedTskTaskRef(result.relativePath)
        setTitleFocusTick((t) => t + 1)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Aufgabe konnte nicht angelegt werden')
      }
    },
    [
      activeTskPath,
      fileSources,
      canWrite,
      registerSidecarFile,
      et2Tasks,
      indexedPathList,
      tskFile,
    ],
  )

  const handleEt2Subtask = useCallback(
    async (parentTaskId?: string) => {
      if (!activeTskPath || !fileSources || !canWrite) {
        window.alert('Unteraufgabe: .tsk.json mit Schreibzugriff öffnen.')
        return
      }
      let parentId: string | null = parentTaskId ?? null
      if (!parentId && selectedTskTaskRef) {
        const ref = taskRefFromPath(selectedTskTaskRef)
        parentId = ref?.taskId ?? null
      }
      if (!parentId) {
        window.alert('Zuerst eine übergeordnete Aufgabe wählen.')
        return
      }
      const parentDir = activeTskPath.includes('/')
        ? activeTskPath.slice(0, activeTskPath.lastIndexOf('/'))
        : ''
      try {
        const result = await createEt2TaskOnDisk(fileSources, {
          dirPath: parentDir,
          tskPath: activeTskPath,
          title: '',
          body: '',
          parentId,
          indexedPaths: indexedPathList,
        })
        registerSidecarFile(result.row)
        clearMarkdownDrafts()
        et2Tasks.reload()
        await tskFile.reload()
        setSelectedTskTaskRef(result.relativePath)
        setTitleFocusTick((t) => t + 1)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Unteraufgabe konnte nicht angelegt werden')
      }
    },
    [
      activeTskPath,
      selectedTskTaskRef,
      fileSources,
      canWrite,
      registerSidecarFile,
      et2Tasks,
      indexedPathList,
      tskFile,
    ],
  )

  const handleEt2DeleteTask = useCallback(
    async (taskId: string) => {
      if (!activeTskPath || !fileSources || !canWrite) return
      try {
        const { row, removedIds } = await deleteEt2TaskFromBundle(fileSources, activeTskPath, taskId)
        registerSidecarFile({
          relativePath: activeTskPath,
          name: activeTskPath.split('/').pop() ?? activeTskPath,
          kind: 'file',
          size: row.size,
          lastModified: row.lastModified ?? Date.now(),
        })
        pickNextTaskRefAfterDelete(removedIds)
        et2Tasks.reload()
        await tskFile.reload()
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
      }
    },
    [
      activeTskPath,
      fileSources,
      canWrite,
      registerSidecarFile,
      pickNextTaskRefAfterDelete,
      et2Tasks,
      tskFile,
    ],
  )

  const handleEt2ReparentConfirm = useCallback(
    async (newParentId: string | null) => {
      if (!activeTskPath || !fileSources || !canWrite || !reparentTaskId) return
      try {
        const { row } = await reparentEt2Task(fileSources, activeTskPath, reparentTaskId, newParentId)
        registerSidecarFile({
          relativePath: activeTskPath,
          name: activeTskPath.split('/').pop() ?? activeTskPath,
          kind: 'file',
          size: row.size,
          lastModified: row.lastModified ?? Date.now(),
        })
        setReparentTaskId(null)
        et2Tasks.reload()
        await tskFile.reload()
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Verschieben fehlgeschlagen')
      }
    },
    [activeTskPath, fileSources, canWrite, reparentTaskId, registerSidecarFile, et2Tasks, tskFile],
  )

  const finalizeNewEt2Task = useCallback(
    async (dirPath: string, title: string, body: string) => {
      if (!fileSources) {
        throw new Error('Ordner nicht verbunden. Bitte oben „Ordner verbinden“.')
      }
      const effectiveTitle = title.trim() || DEFAULT_NEW_TASK_TITLE
      const { row, bundlePath, taskId } = await createEt2TaskOnDisk(fileSources, {
        dirPath,
        title: effectiveTitle,
        body,
        indexedPaths: indexedPathList,
      })
      const entryId = registerSidecarFile(row)
      clearMarkdownDrafts()
      et2Tasks.reload()
      if (entryId) setSelectedId(entryId)
      setSelectedTskTaskRef(makeBundledTaskRef(bundlePath, taskId))
    },
    [fileSources, registerSidecarFile, et2Tasks, indexedPathList, setSelectedId],
  )

  const openNewEt2TaskWithDialog = useCallback(
    (dirPath: string) => {
      if (!fileSources || !canWrite) return
      setNewEt2TaskRequest({ dirPath })
    },
    [fileSources, canWrite],
  )

  const handleConnectWorkspace = useCallback(() => {
    if (supportsFsPicker) {
      if (needsFolderReconnect) void reconnectLastFolder()
      else void handleOpenFolder()
    } else {
      fallbackInputRef.current?.click()
    }
  }, [supportsFsPicker, needsFolderReconnect, reconnectLastFolder, handleOpenFolder])

  const handleSaveEt2TaskContent = useCallback(async () => {
    if (!selectedTskTaskRef) return
    try {
      const stats = await et2TaskEditor.save()
      if (!stats) return
      const ref = taskRefFromPath(selectedTskTaskRef)
      const rel = ref?.bundlePath ?? activeTskPath
      if (!rel) return
      const name = rel.split('/').pop() ?? rel
      registerSidecarFile({
        relativePath: rel,
        name,
        kind: 'file',
        size: stats.size,
        lastModified: stats.lastModified,
      })
      if (ref?.taskId) {
        tskFile.patchTask(ref.taskId, stats.persisted)
        et2Tasks.patchTask(selectedTskTaskRef, stats.persisted)
      }
    } catch {
      // Fehler im Hook gesetzt
    }
  }, [
    selectedTskTaskRef,
    et2TaskEditor,
    registerSidecarFile,
    activeTskPath,
    tskFile,
    et2Tasks,
  ])

  useEt2Autosave({
    enabled: Boolean(activeTskPath && selectedTskTaskRef),
    dirty: et2TaskEditor.dirty,
    loading: et2TaskEditor.loading,
    save: handleSaveEt2TaskContent,
    debounceMs: 400,
    watch: [
      et2TaskEditor.title,
      et2TaskEditor.body,
      et2TaskEditor.status,
      et2TaskEditor.tags,
      et2TaskEditor.dueDate,
      et2TaskEditor.reminderDate,
      et2TaskEditor.link,
      et2TaskEditor.command,
      et2TaskEditor.effort,
      et2TaskEditor.effortUnit,
    ],
  })

  const reloadTskBundleOnDisk = useCallback(
    async (bundlePath: string, row: { size?: number; lastModified?: number }) => {
      registerSidecarFile({
        relativePath: bundlePath,
        name: bundlePath.split('/').pop() ?? bundlePath,
        kind: 'file',
        size: row.size,
        lastModified: row.lastModified ?? Date.now(),
      })
      void et2Tasks.reload({ silent: true })
      await tskFile.reload({ silent: true })
    },
    [registerSidecarFile, et2Tasks, tskFile],
  )

  const handleEt2NestTask = useCallback(
    async (taskId: string, newParentId: string | null) => {
      if (!activeTskPath || !fileSources || !canWrite) return
      try {
        const { row } = await nestEt2TaskUnder(fileSources, activeTskPath, taskId, newParentId)
        await reloadTskBundleOnDisk(activeTskPath, row)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Verschieben fehlgeschlagen')
      }
    },
    [activeTskPath, fileSources, canWrite, reloadTskBundleOnDisk],
  )

  const handleEt2ReorderTask = useCallback(
    async (taskId: string, anchorTaskId: string, place: 'before' | 'after') => {
      if (!activeTskPath || !fileSources || !canWrite) return
      try {
        const { row } = await reorderEt2TaskRelative(
          fileSources,
          activeTskPath,
          taskId,
          anchorTaskId,
          place,
        )
        await reloadTskBundleOnDisk(activeTskPath, row)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Umsortieren fehlgeschlagen')
      }
    },
    [activeTskPath, fileSources, canWrite, reloadTskBundleOnDisk],
  )

  const handleEt2MoveSibling = useCallback(
    async (taskId: string, direction: 'up' | 'down') => {
      if (!activeTskPath || !fileSources || !canWrite) return
      try {
        const { row } = await moveEt2TaskSibling(fileSources, activeTskPath, taskId, direction)
        await reloadTskBundleOnDisk(activeTskPath, row)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Verschieben fehlgeschlagen')
      }
    },
    [activeTskPath, fileSources, canWrite, reloadTskBundleOnDisk],
  )

  const handleEt2Indent = useCallback(
    async (taskId: string) => {
      if (!activeTskPath || !fileSources || !canWrite) return
      try {
        const { row } = await indentEt2Task(fileSources, activeTskPath, taskId)
        await reloadTskBundleOnDisk(activeTskPath, row)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Einrücken fehlgeschlagen')
      }
    },
    [activeTskPath, fileSources, canWrite, reloadTskBundleOnDisk],
  )

  const handleEt2Outdent = useCallback(
    async (taskId: string) => {
      if (!activeTskPath || !fileSources || !canWrite) return
      try {
        const { row } = await outdentEt2Task(fileSources, activeTskPath, taskId)
        await reloadTskBundleOnDisk(activeTskPath, row)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Ausrücken fehlgeschlagen')
      }
    },
    [activeTskPath, fileSources, canWrite, reloadTskBundleOnDisk],
  )

  const handleOpenContextInScope = useCallback(() => {
    if (!contextMenu) return
    if (contextMenu.kind === 'directory') {
      navigateToPath(contextMenu.path, contextMenu.id)
      return
    }
    const parent = contextMenu.path.includes('/')
      ? contextMenu.path.slice(0, contextMenu.path.lastIndexOf('/'))
      : ''
    setCurrentPath(parent)
    setSelectedId(contextMenu.id)
    setFileView(null)
    setMetadataTarget(null)
    if (isTskJsonPath(contextMenu.path)) {
      setSelectedTskTaskRef(null)
    }
  }, [contextMenu, navigateToPath, setCurrentPath, setSelectedId])

  const applyRelocatedFileInIndex = useCallback(
    (from: string, row: RawFileRow, sidecarRow: RawFileRow | null, oldEntryId?: string) => {
      const newId = moveIndexedFile(from, row, sidecarRow)
      if (!newId) throw new Error('Index konnte nicht aktualisiert werden.')
      if (oldEntryId && selectedIds.has(oldEntryId)) {
        setSelectedIds((prev) => {
          if (!oldEntryId || !prev.has(oldEntryId)) return prev
          const next = new Set(prev)
          next.delete(oldEntryId)
          next.add(newId)
          return next
        })
      }
      if (selectedId === oldEntryId) setSelectedIdRaw(newId)
      if (fileView?.path === from) {
        setFileView((prev) =>
          prev ? { ...prev, path: row.relativePath, name: row.name, id: newId } : prev,
        )
      }
      if (metadataTarget?.path === from) {
        setMetadataTarget({
          ...metadataTarget,
          path: row.relativePath,
          name: row.name,
        })
      }
      if (selectedTskTaskRef) {
        const ref = taskRefFromPath(selectedTskTaskRef)
        if (ref?.bundlePath === from) {
          setSelectedTskTaskRef(makeBundledTaskRef(row.relativePath, ref.taskId))
        }
      }
      void et2Tasks.reload()
      if (aggregateTasksDir !== null) void aggregateEt2Tasks.reload()
      return newId
    },
    [
      moveIndexedFile,
      selectedId,
      selectedIds,
      setSelectedIdRaw,
      fileView?.path,
      metadataTarget,
      selectedTskTaskRef,
      et2Tasks,
      aggregateTasksDir,
      aggregateEt2Tasks,
      setSelectedId,
    ],
  )

  const handleMoveEntryToDirectory = useCallback(
    async (sourcePath: string, destDirPath: string, kind: 'file' | 'directory') => {
      if (!fileSources || !canWrite || !manifest) return
      const from = sourcePath.replace(/\\/g, '/')
      const destDir = destDirPath.replace(/\\/g, '/')
      if (kind === 'directory') {
        if (!from) return
        const oldEntry = manifest.entries.find((e) => e.path === from && e.kind === 'directory')
        try {
          const { newPath, rows } = await moveDirectoryInStore(
            fileSources,
            from,
            destDir,
            manifest,
          )
          const selPath = selectedNode?.path ?? null
          const { newRootId, selectionId } = moveIndexedDirectory(from, newPath, rows, selPath)
          if (fileSources.kind === 'handles' && fileSources.vaultRoots?.length) {
            const roots = fileSources.vaultRoots.map((r) => {
              if (r === from) return newPath
              if (r.startsWith(`${from}/`)) return remapSubtreePath(from, newPath, r)
              return r
            })
            setFileSources((prev) => (prev ? { ...prev, vaultRoots: roots } : prev))
          }
          if (selectionId) setSelectedId(selectionId)
          else if (oldEntry && selectedId === oldEntry.id && newRootId) setSelectedId(newRootId)
          if (pathIsUnderDir(from, currentPath)) {
            setCurrentPath(remapSubtreePath(from, newPath, currentPath))
          }
          if (fileView && pathIsUnderDir(from, fileView.path)) {
            const np = remapSubtreePath(from, newPath, fileView.path)
            setFileView((prev) =>
              prev
                ? {
                    ...prev,
                    path: np,
                    name: np.split('/').pop() ?? prev.name,
                    id: selectionId && prev.path === selPath ? selectionId : prev.id,
                  }
                : prev,
            )
          }
          if (selectedTskTaskRef) {
            const ref = taskRefFromPath(selectedTskTaskRef)
            if (ref && pathIsUnderDir(from, ref.bundlePath)) {
              setSelectedTskTaskRef(
                makeBundledTaskRef(remapSubtreePath(from, newPath, ref.bundlePath), ref.taskId),
              )
            }
          }
          if (aggregateTasksDir !== null && pathIsUnderDir(from, aggregateTasksDir)) {
            setAggregateTasksDir(remapSubtreePath(from, newPath, aggregateTasksDir))
          }
          void et2Tasks.reload()
          if (aggregateTasksDir !== null) void aggregateEt2Tasks.reload()
        } catch (err) {
          window.alert(err instanceof Error ? err.message : 'Ordner konnte nicht verschoben werden')
        }
        return
      }

      const newPath = resolveMoveFilePath(from, destDir)
      if (newPath === from) return
      const oldEntry = manifest.entries.find((e) => e.path === from)
      try {
        const { row, sidecarRow } = await moveFileInStore(
          fileSources,
          from,
          destDir,
          indexedFilePaths,
        )
        applyRelocatedFileInIndex(from, row, sidecarRow, oldEntry?.id)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Verschieben fehlgeschlagen')
      }
    },
    [
      fileSources,
      canWrite,
      manifest,
      indexedFilePaths,
      applyRelocatedFileInIndex,
      moveIndexedDirectory,
      setFileSources,
      selectedId,
      setSelectedId,
      currentPath,
      setCurrentPath,
      fileView,
      et2Tasks,
      aggregateTasksDir,
      aggregateEt2Tasks,
      selectedNode?.path,
      selectedTskTaskRef,
    ],
  )

  const handleRenameFile = useCallback(
    async (filePath: string, currentName: string) => {
      if (!fileSources || !canWrite || !manifest) return
      const from = filePath.replace(/\\/g, '/')
      if (isSidecarForIndexedFile(from, indexedFilePaths)) {
        window.alert(
          'Metadaten-JSON (.json): Bitte die zugehörige Datei umbenennen — die Metadaten werden mit verschoben.',
        )
        return
      }
      const promptTitle = isTskJsonPath(from) ? 'Aufgaben-Datei umbenennen:' : 'Datei umbenennen:'
      const input = window.prompt(promptTitle, currentName)
      if (input === null) return
      let newName: string
      try {
        newName = isTskJsonPath(from)
          ? normalizeTskJsonFileNameInput(input)
          : normalizeRenameFileNameInput(input)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Ungültiger Dateiname')
        return
      }
      const oldEntry = manifest.entries.find((e) => e.path === from)
      try {
        const { row, sidecarRow } = await renameFileInStore(
          fileSources,
          from,
          newName,
          indexedFilePaths,
        )
        applyRelocatedFileInIndex(from, row, sidecarRow, oldEntry?.id)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Umbenennen fehlgeschlagen')
      }
    },
    [fileSources, canWrite, manifest, indexedFilePaths, applyRelocatedFileInIndex],
  )

  const handleDeleteContextTarget = useCallback(async () => {
    if (!contextMenu || !fileSources || !manifest) return
    const { path, kind, name } = contextMenu
    if (kind === 'directory' && path === '') return
    const label = kind === 'directory' ? `Ordner „${name}“` : `Datei „${name}“`
    const detail =
      kind === 'directory'
        ? 'Inklusive aller Dateien und Unterordner auf der Festplatte.'
        : 'Die Datei wird von der Festplatte entfernt.'
    if (!window.confirm(`${label} endgültig löschen?\n\n${detail}`)) return
    try {
      await deletePathFromStore(fileSources, path, kind)
      if (!removeIndexedPath(path, kind)) {
        throw new Error('Eintrag fehlt im Index.')
      }
      if (selectedId === contextMenu.id) {
        setSelectedId(null)
        setSelectedTskTaskRef(null)
      }
      if (kind === 'directory' && (currentPath === path || currentPath.startsWith(`${path}/`))) {
        const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
        setCurrentPath(parent)
      }
      const victim = fileView?.path
      if (
        victim &&
        (victim === path || (kind === 'directory' && victim.startsWith(`${path}/`)))
      ) {
        setFileView(null)
      }
      if (
        metadataTarget &&
        (metadataTarget.path === path ||
          (kind === 'directory' && metadataTarget.path.startsWith(`${path}/`)))
      ) {
        setMetadataTarget(null)
      }
      et2Tasks.reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
    }
  }, [
    contextMenu,
    fileSources,
    manifest,
    removeIndexedPath,
    selectedId,
    currentPath,
    fileView?.path,
    metadataTarget,
    et2Tasks,
    setCurrentPath,
    setSelectedId,
  ])

  const handleEt2MigrateFile = useCallback(
    async (relativePath: string, content: string, size: number) => {
      if (!fileSources) throw new Error('Keine Dateiquelle')
      await writeTextToStore(fileSources, relativePath, content)
      const name = relativePath.split('/').pop() ?? relativePath
      registerSidecarFile({
        relativePath,
        name,
        kind: 'file',
        size,
        lastModified: Date.now(),
      })
    },
    [fileSources, registerSidecarFile],
  )

  const handleSaveMetadata = useCallback(async () => {
    setSaveError(null)
    try {
      const stats = await sidecar.save()
      if (stats && manifest) {
        const sidecarPath = sidecarPathForFile(metadataTarget!.path)
        const name = sidecarPath.split('/').pop() ?? sidecarPath
        registerSidecarFile({
          relativePath: sidecarPath,
          name,
          kind: 'file',
          size: stats.size,
          lastModified: stats.lastModified,
        })
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
      throw err
    }
  }, [sidecar, manifest, metadataTarget, registerSidecarFile])

  const indexing = progress.phase === 'reading'

  const centerPane = !manifest ? null : metadataTarget ? (
    <MetadataEditor
      targetPath={metadataTarget.path}
      targetName={metadataTarget.name}
      sidecarPath={sidecarPathForFile(metadataTarget.path)}
      data={sidecar.data}
      onChange={sidecar.updateData}
      viewMode={sidecar.viewMode}
      onViewModeChange={sidecar.setViewMode}
      loading={sidecar.loading}
      error={sidecar.error}
      dirty={sidecar.dirty}
      isNew={sidecar.isNew}
      canWrite={canWrite}
      onSave={handleSaveMetadata}
      onDownload={sidecar.download}
      onClose={() => setMetadataTarget(null)}
      saveError={saveError}
    />
  ) : fileView && !viewerPinned ? (
    <FileViewerRouter
      target={fileViewTarget ?? fileView}
      fileSources={fileSources}
      onClose={() => setFileView(null)}
      variant="center"
      markdown={markdownEditorProps}
      e2Board={e2BoardViewerProps}
      size={fileView.size}
    />
  ) : (
    <FileBrowser
      rootName={manifest.rootName}
      entries={manifest.entries}
      onNavigate={(path) => navigateToPath(path, null)}
      onSelectEntry={handleSelectEntry}
      selectedId={selectedId}
      selectedIds={selectedIds}
      searchQuery={searchQuery}
      searchTasksOnly={searchTasksOnly}
      searchResults={searchResults}
      indexedFilePaths={indexedFilePaths}
      hasSidecar={hasSidecar}
      onOpenViewer={openViewer}
      onFileContextMenu={setContextMenu}
      showEt2DotFiles={showEt2DotFiles}
      scopePath={currentPath}
      canWrite={canWrite}
      onNewFolder={() => void handleNewFolder(currentPath)}
      onNewMarkdown={() => void handleNewMarkdown(currentPath)}
      onNewVaultFolder={() => void handleNewVaultFolder(currentPath)}
      onNewTskFile={() => openNewEt2TaskWithDialog(currentPath)}
      onNewLinkFile={() => void handleNewLinkFile(currentPath)}
      onNewDrawioFile={() => void handleNewDrawioFile(currentPath)}
      onNewE2Board={() => void handleNewE2Board(currentPath)}
      onUploadFiles={(files) => void handleUploadFilesToScope(currentPath, files)}
      vaultRoots={fileSources?.vaultRoots}
      onUnlockVault={(root) => setVaultUnlockTarget(root)}
      onLockVault={handleVaultLock}
    />
  )

  return (
    <div className="fsidx-app-shell flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <input
        ref={fallbackInputRef}
        type="file"
        className="hidden"
        // @ts-expect-error non-standard but widely supported
        webkitdirectory=""
        directory=""
        multiple
        onChange={onFallbackChange}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onImportJson}
      />

      <div className="shrink-0">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchTasksOnly={searchTasksOnly}
        onSearchTasksOnlyChange={setSearchTasksOnly}
        onOpenFolder={handleOpenFolder}
        onFallbackInput={() => fallbackInputRef.current?.click()}
        onImportJson={() => importInputRef.current?.click()}
        onClear={handleClear}
        manifest={manifest}
        supportsFsPicker={supportsFsPicker}
        indexing={indexing}
        indexProgress={progress}
        showEt2DotFiles={showEt2DotFiles}
        onShowEt2DotFilesChange={setShowEt2DotFiles}
        hasLegacyEt2={hasLegacyEt2}
        onEt2Migrate={() => setEt2MigrateOpen(true)}
        vaultRoots={fileSources?.vaultRoots}
      />
      </div>

      <Et2MigrateDialog
        open={et2MigrateOpen && Boolean(manifest)}
        onClose={() => setEt2MigrateOpen(false)}
        canWrite={canWrite}
        onApplyFile={handleEt2MigrateFile}
        onApplied={() => et2Tasks.reload()}
      />

      <Et2ReparentDialog
        open={Boolean(reparentTaskId) && Boolean(activeTskPath)}
        taskId={reparentTaskId ?? ''}
        tasks={tskFile.tasks}
        onCancel={() => setReparentTaskId(null)}
        onConfirm={(parentId) => void handleEt2ReparentConfirm(parentId)}
      />

      {manifest && (
        <WorkspaceConnectionBanner
          state={connectionState}
          rootName={manifest.rootName}
          supportsFsPicker={supportsFsPicker}
          onConnect={handleConnectWorkspace}
        />
      )}

      {!manifest ? (
        <Welcome
          onOpenFolder={handleOpenFolder}
          onFallback={() => fallbackInputRef.current?.click()}
          supportsFsPicker={supportsFsPicker}
          loading={indexing || !sessionReady}
          error={progress.phase === 'error' ? progress.message : undefined}
          className="min-h-0 flex-1 overflow-auto"
        />
      ) : (
        <div
          className="fsidx-main-grid min-h-0 flex-1"
          style={{ ['--fsidx-sidebar-w' as string]: `${sidebarWidthPx}px` }}
        >
          <div className="fsidx-pane hidden lg:flex">
            <TreeNav
              root={manifest.tree}
              entries={manifest.entries}
              rootName={manifest.rootName}
              currentPath={currentPath}
              selectedId={selectedId}
              showEt2DotFiles={showEt2DotFiles}
              onSelectPath={(path, nodeId) => navigateToPath(path, nodeId)}
              et2TaskCountByDir={et2TaskCountByDir}
              onContextMenu={setContextMenu}
              canWrite={canWrite}
              onDropFileToDir={(path, dir, kind) => void handleMoveEntryToDirectory(path, dir, kind)}
              vaultRoots={fileSources?.vaultRoots}
            />
          </div>
          <div className="fsidx-pane min-h-0">{centerPane}</div>
          <div className="fsidx-pane hidden lg:flex">
          <DetailPanel
            manifest={manifest}
            node={inspectNode}
            jsonPreview={jsonPreview}
            aggregateTaskSlot={
              aggregateTasksDir !== null ? (
                <Et2AggregateTaskPanel
                  scopePath={aggregateTasksDir}
                  rootName={manifest.rootName}
                  tasks={aggregateEt2Tasks.tasks}
                  loading={aggregateEt2Tasks.loading}
                  onOpenTask={handleOpenTaskFromAggregate}
                  onClose={() => setAggregateTasksDir(null)}
                />
              ) : undefined
            }
            legacyNoticeSlot={
              isLegacyTaskFile && selectedNode ? (
                <LegacyTaskNotice
                  fileName={selectedNode.name}
                  canWrite={canWrite}
                  onCreateTsk={() =>
                    openNewEt2TaskWithDialog(taskContainerDir(selectedNode.path) || currentPath)
                  }
                  onOpenAsMarkdown={() =>
                    openViewer(
                      'markdown',
                      selectedNode.path,
                      selectedNode.name,
                      selectedNode.id,
                      selectedNode.size,
                    )
                  }
                />
              ) : undefined
            }
            tskDetailSlot={
              activeTskPath && selectedNode ? (
                <TskDetailPanel
                  tskPath={activeTskPath}
                  fileName={selectedNode.name}
                  tasks={tskFile.tasks}
                  loading={tskFile.loading}
                  loadError={tskFile.error}
                  selectedTaskRef={selectedTskTaskRef}
                  onSelectTask={setSelectedTskTaskRef}
                  onNewSubtask={(parentId) => void handleEt2Subtask(parentId)}
                  onNewSibling={(anchorId) => void handleEt2SiblingAfter(anchorId)}
                  onRenameTskFile={() => void handleRenameFile(activeTskPath, selectedNode.name)}
                  onDeleteTask={(taskId) => void handleEt2DeleteTask(taskId)}
                  onReparentTask={(taskId) => setReparentTaskId(taskId)}
                  onNestTask={(taskId, parentId) => void handleEt2NestTask(taskId, parentId)}
                  onReorderTask={(taskId, anchor, place) =>
                    void handleEt2ReorderTask(taskId, anchor, place)
                  }
                  onMoveSibling={(taskId, dir) => void handleEt2MoveSibling(taskId, dir)}
                  onIndentTask={(taskId) => void handleEt2Indent(taskId)}
                  onOutdentTask={(taskId) => void handleEt2Outdent(taskId)}
                  canWrite={canWrite}
                  title={et2TaskEditor.title}
                  body={et2TaskEditor.body}
                  status={et2TaskEditor.status}
                  tags={et2TaskEditor.tags}
                  dueDate={et2TaskEditor.dueDate}
                  reminderDate={et2TaskEditor.reminderDate}
                  link={et2TaskEditor.link}
                  command={et2TaskEditor.command}
                  effort={et2TaskEditor.effort}
                  effortUnit={et2TaskEditor.effortUnit}
                  onTitleChange={et2TaskEditor.updateTitle}
                  onBodyChange={et2TaskEditor.updateBody}
                  onStatusChange={et2TaskEditor.updateStatus}
                  onTagsChange={et2TaskEditor.updateTags}
                  onDueDateChange={et2TaskEditor.updateDueDate}
                  onReminderDateChange={et2TaskEditor.updateReminderDate}
                  onLinkChange={et2TaskEditor.updateLink}
                  onCommandChange={et2TaskEditor.updateCommand}
                  onEffortChange={et2TaskEditor.updateEffort}
                  onEffortUnitChange={et2TaskEditor.updateEffortUnit}
                  onDeleteFromDetail={() => {
                    const ref = selectedTskTaskRef ? taskRefFromPath(selectedTskTaskRef) : null
                    if (ref) void handleEt2DeleteTask(ref.taskId)
                  }}
                  editorLoading={et2TaskEditor.loading}
                  editorSaving={et2TaskEditor.saving}
                  editorDirty={et2TaskEditor.dirty}
                  editorError={et2TaskEditor.error}
                  editorTaskId={et2TaskEditor.taskId}
                  titleFocusTick={titleFocusTick}
                  fileSources={fileSources}
                />
              ) : undefined
            }
            drawioDetailSlot={
              activeDrawioPath &&
              selectedNode &&
              !activeTskPath &&
              !activeLinkPath &&
              !activeE2Path ? (
                <DrawioDetailPanel
                  filePath={activeDrawioPath}
                  fileName={selectedNode.name}
                  xml={drawioFile.xml}
                  loading={drawioFile.loading}
                  loadError={drawioFile.error}
                  canWrite={canWrite}
                  saving={drawioSaving}
                  saveError={drawioSaveError}
                  fullscreen={drawioDetailFullscreen}
                  onToggleFullscreen={() => setDrawioDetailFullscreen((v) => !v)}
                  onXmlChange={handleDrawioXmlChange}
                  onWidenPanel={handleWidenDrawioPanel}
                />
              ) : undefined
            }
            drawioFullscreen={drawioDetailFullscreen}
            e2DetailSlot={
              !viewerPinned &&
              activeE2Path &&
              selectedNode &&
              !activeTskPath &&
              !activeLinkPath &&
              !activeDrawioPath ? (
                <E2DetailPanel
                  filePath={activeE2Path}
                  fileName={selectedNode.name}
                  json={e2File.json}
                  loading={e2File.loading}
                  loadError={e2File.error}
                  canWrite={canWrite}
                  saving={e2Saving}
                  saveError={e2SaveError}
                  fullscreen={e2DetailFullscreen}
                  onToggleFullscreen={() => setE2DetailFullscreen((v) => !v)}
                  onJsonChange={handleE2JsonChange}
                  onWidenPanel={handleWidenDrawioPanel}
                />
              ) : undefined
            }
            e2Fullscreen={e2DetailFullscreen}
            linkDetailSlot={
              activeLinkPath && selectedNode && !activeTskPath ? (
                <LinkDetailPanel
                  linkPath={activeLinkPath}
                  fileName={selectedNode.name}
                  doc={linkDraft}
                  loading={linkFile.loading}
                  loadError={linkFile.error}
                  canWrite={canWrite}
                  saving={linkSaving}
                  saveError={linkSaveError}
                  onChange={(patch) =>
                    setLinkDraft((prev) => (prev ? { ...prev, ...patch } : prev))
                  }
                  onSave={() => void handleSaveLinkFile()}
                  onOpenPreview={() =>
                    openViewer(
                      'link',
                      activeLinkPath,
                      linkDraft?.title ?? selectedNode.name,
                      selectedNode.id,
                      selectedNode.size,
                    )
                  }
                />
              ) : undefined
            }
            viewerPinned={viewerPinned}
            onViewerPinnedChange={setViewerPinned}
            viewerSlot={
              viewerPinned && fileView ? (
                <FileViewerRouter
                  target={fileViewTarget ?? fileView}
                  fileSources={fileSources}
                  onClose={() => setFileView(null)}
                  variant="sidebar"
                  markdown={markdownEditorProps}
                  e2Board={e2BoardViewerProps}
                  size={fileView.size}
                />
              ) : undefined
            }
            onDirectoryReadme={(dirPath, dirId) => void handleDirectoryReadme(dirPath, dirId)}
            hasDirectoryReadme={
              inspectNode?.kind === 'directory'
                ? indexedFilePaths.has(directoryReadmePath(inspectNode.path))
                : false
            }
            onSidebarWidthChange={handleSidebarResizeLive}
            onSidebarWidthCommit={handleSidebarResizeCommit}
            sidebarWidthPx={sidebarWidthPx}
            sidebarMinWidth={sidebarMinWidth}
            sidebarMaxWidth={sidebarMaxWidthEffective}
            metadataVisible={detailMetadataVisible}
            onMetadataVisibleChange={setDetailMetadataVisible}
          />
          </div>
        </div>
      )}

      {newEt2TaskRequest && (
        <Et2NewTaskDialog
          open
          targetDirPath={newEt2TaskRequest.dirPath}
          onClose={() => setNewEt2TaskRequest(null)}
          onSubmit={finalizeNewEt2Task}
          scopeLabel={formatScopeLabel(newEt2TaskRequest.dirPath, manifest?.rootName)}
        />
      )}

      <FileContextMenu
        target={contextMenu}
        workspaceRootName={manifest?.rootName ?? 'Workspace'}
        onClose={() => setContextMenu(null)}
        hasSidecar={contextMenu ? hasSidecar(contextMenu.path) : false}
        canWrite={canWrite}
        onCreateOrEditMetadata={() => {
          if (!contextMenu) return
          openMetadata(contextMenu.path, contextMenu.name, contextMenu.id)
        }}
        onOpenViewer={(kind) => {
          if (!contextMenu) return
          openViewer(kind, contextMenu.path, contextMenu.name, contextMenu.id)
        }}
        hasDirectoryReadme={
          contextMenu?.kind === 'directory'
            ? indexedFilePaths.has(directoryReadmePath(contextMenu.path))
            : false
        }
        onDirectoryReadme={() => {
          if (!contextMenu || contextMenu.kind !== 'directory') return
          void handleDirectoryReadme(contextMenu.path, contextMenu.id)
        }}
        onEt2NewTask={() => {
          if (!contextMenu || contextMenu.kind !== 'directory') return
          openNewEt2TaskWithDialog(contextMenu.path)
        }}
        onNewSubfolder={() => {
          if (!contextMenu || contextMenu.kind !== 'directory') return
          void handleNewFolder(contextMenu.path)
        }}
        onNewMarkdown={() => {
          if (!contextMenu || contextMenu.kind !== 'directory') return
          void handleNewMarkdown(contextMenu.path)
        }}
        onPasteFromClipboard={
          contextMenu?.kind === 'directory'
            ? () => void handlePasteFromClipboard(contextMenu.path)
            : undefined
        }
        onAggregateTasks={
          contextMenu?.kind === 'directory'
            ? () => {
                setAggregateTasksDir(contextMenu.path)
                setContextMenu(null)
              }
            : undefined
        }
        onOpenInScope={() => handleOpenContextInScope()}
        onRename={
          contextMenu?.kind === 'file' && canWrite
            ? () => void handleRenameFile(contextMenu.path, contextMenu.name)
            : undefined
        }
        onDelete={
          contextMenu && (contextMenu.kind === 'file' || contextMenu.path !== '')
            ? () => void handleDeleteContextTarget()
            : undefined
        }
      />

      <VaultUnlockDialog
        open={vaultUnlockTarget !== null}
        vaultLabel={vaultUnlockTarget?.split('/').pop() ?? 'Tresor'}
        onClose={() => setVaultUnlockTarget(null)}
        onUnlock={handleVaultUnlock}
      />
    </div>
  )
}

export default App