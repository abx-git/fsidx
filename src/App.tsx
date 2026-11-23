import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findNodeByPath } from './lib/build-manifest'
import { defaultViewerForFile, type FileViewerKind } from './lib/file-viewers'
import {
  DIRECTORY_README_NAME,
  buildDefaultDirectoryReadme,
  directoryReadmePath,
} from './lib/directory-readme'
import { canWriteToStore, writeTextToStore } from './lib/file-sources'
import { sidecarPathForFile } from './lib/sidecar'
import { Header } from './components/Header'
import { TskDetailPanel } from './components/et2/TskDetailPanel'
import { Et2NewTaskDialog } from './components/et2/Et2NewTaskDialog'
import { Et2MigrateDialog } from './components/et2/Et2MigrateDialog'
import { createEt2TaskOnDisk } from './lib/et2/create-task'
import {
  deleteEt2TaskFromBundle,
  reparentEt2Task,
} from './lib/et2/tasks-bundle'
import { Et2ReparentDialog } from './components/et2/Et2ReparentDialog'
import { createDirectoryInScope, createMarkdownInScope } from './lib/create-workspace'
import { deletePathFromStore } from './lib/delete-workspace'
import { isTskJsonPath } from './lib/et2/tsk-paths'
import { isTaskFilePath, makeBundledTaskRef, taskRefFromPath } from './lib/et2/paths'
import { sanitizeScopePath } from './lib/scope-sanitize'
import { LegacyTaskNotice } from './components/et2/LegacyTaskNotice'
import { taskContainerDir } from './lib/workspace-scope'
import { looksLikeOpaqueId } from './lib/et2/display-title'
import { useEt2TaskSummaries } from './hooks/useEt2TaskSummaries'
import { useEt2TaskEditor } from './hooks/useEt2TaskEditor'
import { useTskFile } from './hooks/useTskFile'
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
  const [markdownSaveError, setMarkdownSaveError] = useState<string | null>(null)
  const [markdownSaving, setMarkdownSaving] = useState(false)
  const [showEt2DotFiles, setShowEt2DotFiles] = useState(false)
  const [et2MigrateOpen, setEt2MigrateOpen] = useState(false)
  const [selectedTskTaskRef, setSelectedTskTaskRef] = useState<string | null>(null)
  const [newEt2TaskRequest, setNewEt2TaskRequest] = useState<{ dirPath: string } | null>(null)
  const [reparentTaskId, setReparentTaskId] = useState<string | null>(null)
  const [titleFocusTick, setTitleFocusTick] = useState(0)

  const {
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
    supportsFsPicker,
    indexedFilePaths,
    hasSidecar,
    registerSidecarFile,
    removeIndexedPath,
    sessionReady,
    needsFolderReconnect,
    reconnectLastFolder,
  } = useFileIndex()

  const { pinned: viewerPinned, setPinned: setViewerPinned } = useViewerPanelPinned()
  const { visible: detailMetadataVisible, setVisible: setDetailMetadataVisible } =
    useDetailMetadataVisible()
  const {
    expanded: viewerExpanded,
    setExpanded: setViewerExpanded,
    widthPx: sidebarWidthPx,
    setWidthPx: setSidebarWidthPx,
    minWidth: sidebarMinWidth,
    maxWidth: sidebarMaxWidth,
  } = useViewerSidebarLayout()

  useEffect(() => {
    if (!viewerPinned || metadataTarget) return
    if (!selectedNode || selectedNode.kind !== 'file') {
      setFileView(null)
      return
    }
    if (isTskJsonPath(selectedNode.path) || isTaskFilePath(selectedNode.path)) {
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

  const markdown = useMarkdownDocument(
    fileView?.viewer === 'markdown' ? fileView.path : null,
    fileSources,
  )

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

  const indexedPathList = useMemo(
    () => (manifest ? manifest.entries.filter((e) => e.kind === 'file').map((e) => e.path) : []),
    [manifest],
  )

  const et2Tasks = useEt2TaskSummaries(indexedPathList, currentPath, fileSources)

  const activeTskPath = useMemo(() => {
    if (selectedNode?.kind !== 'file' || !isTskJsonPath(selectedNode.path)) return null
    return selectedNode.path
  }, [selectedNode])

  const isLegacyTaskFile = useMemo(
    () => selectedNode?.kind === 'file' && isTaskFilePath(selectedNode.path),
    [selectedNode],
  )

  const tskFile = useTskFile(activeTskPath, fileSources)
  const et2TaskEditor = useEt2TaskEditor(selectedTskTaskRef, fileSources)

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
    return fileView
  }, [fileView, et2Tasks.tasks, markdown.content])


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

  const handleSaveMarkdown = useCallback(async () => {
    setMarkdownSaveError(null)
    setMarkdownSaving(true)
    try {
      await markdown.save()
    } catch (err) {
      setMarkdownSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
      throw err
    } finally {
      setMarkdownSaving(false)
    }
  }, [markdown])

  const markdownEditorProps = useMemo(
    () =>
      fileView?.viewer === 'markdown'
        ? {
            content: markdown.content,
            updateContent: markdown.updateContent,
            viewMode: markdown.viewMode,
            setViewMode: markdown.setViewMode,
            toggleViewMode: markdown.toggleViewMode,
            loading: markdown.loading,
            error: markdown.error,
            dirty: markdown.dirty,
            canWrite,
            onSave: handleSaveMarkdown,
            saving: markdownSaving,
            saveError: markdownSaveError,
          }
        : null,
    [fileView?.viewer, markdown, canWrite, handleSaveMarkdown, markdownSaving, markdownSaveError],
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
      setMarkdownSaveError(null)
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
      const { row, bundlePath, taskId } = await createEt2TaskOnDisk(fileSources, {
        dirPath,
        title,
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

  const createEt2TaskQuick = useCallback(
    (dirPath: string) => {
      if (!fileSources || !canWrite) return
      void finalizeNewEt2Task(dirPath, '', '').catch((err) => {
        window.alert(err instanceof Error ? err.message : 'Aufgaben-Datei konnte nicht angelegt werden')
      })
    },
    [fileSources, canWrite, finalizeNewEt2Task],
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
      if (stats) {
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
        et2Tasks.reload()
        await tskFile.reload()
      }
    } catch {
      // Fehler im Hook gesetzt
    }
  }, [selectedTskTaskRef, et2TaskEditor, registerSidecarFile, et2Tasks, activeTskPath, tskFile])

  const handleNewEt2TaskFromChrome = useCallback(() => {
    createEt2TaskQuick(currentPath)
  }, [createEt2TaskQuick, currentPath])

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

  const indexing =
    progress.phase === 'reading' || progress.phase === 'building'

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
      size={fileView.size}
    />
  ) : (
    <FileBrowser
      rootName={manifest.rootName}
      currentNode={currentNode}
      onNavigate={(path) => navigateToPath(path, null)}
      onSelectEntry={setSelectedId}
      selectedId={selectedId}
      searchQuery={searchQuery}
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
      onNewTask={handleNewEt2TaskFromChrome}
      onNewTaskWithDialog={() => openNewEt2TaskWithDialog(currentPath)}
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
        onOpenFolder={handleOpenFolder}
        onFallbackInput={() => fallbackInputRef.current?.click()}
        onImportJson={() => importInputRef.current?.click()}
        onClear={handleClear}
        manifest={manifest}
        supportsFsPicker={supportsFsPicker}
        indexing={indexing}
        showEt2DotFiles={showEt2DotFiles}
        onShowEt2DotFilesChange={setShowEt2DotFiles}
        onEt2Migrate={() => setEt2MigrateOpen(true)}
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
              rootName={manifest.rootName}
              currentPath={currentPath}
              selectedId={selectedId}
              showEt2DotFiles={showEt2DotFiles}
              onSelectPath={(path, nodeId) => navigateToPath(path, nodeId)}
              indexedFilePaths={indexedPathList}
              onContextMenu={setContextMenu}
            />
          </div>
          <div className="fsidx-pane min-h-0">{centerPane}</div>
          <div className="fsidx-pane hidden lg:flex">
          <DetailPanel
            manifest={manifest}
            node={inspectNode}
            jsonPreview={jsonPreview}
            legacyNoticeSlot={
              isLegacyTaskFile && selectedNode ? (
                <LegacyTaskNotice
                  fileName={selectedNode.name}
                  canWrite={canWrite}
                  onCreateTsk={() =>
                    createEt2TaskQuick(taskContainerDir(selectedNode.path) || currentPath)
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
                  onDeleteTask={(taskId) => void handleEt2DeleteTask(taskId)}
                  onReparentTask={(taskId) => setReparentTaskId(taskId)}
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
                  onSave={handleSaveEt2TaskContent}
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
            viewerExpanded={viewerExpanded}
            onViewerExpandedChange={viewerPinned ? setViewerExpanded : undefined}
            onSidebarWidthChange={setSidebarWidthPx}
            sidebarWidthPx={sidebarWidthPx}
            sidebarMinWidth={sidebarMinWidth}
            sidebarMaxWidth={sidebarMaxWidth}
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
          createEt2TaskQuick(contextMenu.path)
        }}
        onNewSubfolder={() => {
          if (!contextMenu || contextMenu.kind !== 'directory') return
          void handleNewFolder(contextMenu.path)
        }}
        onNewMarkdown={() => {
          if (!contextMenu || contextMenu.kind !== 'directory') return
          void handleNewMarkdown(contextMenu.path)
        }}
        onOpenInScope={() => handleOpenContextInScope()}
        onDelete={
          contextMenu && (contextMenu.kind === 'file' || contextMenu.path !== '')
            ? () => void handleDeleteContextTarget()
            : undefined
        }
      />
    </div>
  )
}

export default App