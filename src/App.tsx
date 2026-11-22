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
import { clearMarkdownDrafts, useMarkdownDocument } from './hooks/useMarkdownDocument'
import { clearSidecarDrafts, useSidecarMetadata } from './hooks/useSidecarMetadata'

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
    sessionReady,
    needsFolderReconnect,
    reconnectLastFolder,
  } = useFileIndex()

  const { pinned: viewerPinned, setPinned: setViewerPinned } = useViewerPanelPinned()

  useEffect(() => {
    if (!viewerPinned || metadataTarget) return
    if (!selectedNode || selectedNode.kind !== 'file') {
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

  const inspectNode = useMemo(() => {
    if (!manifest) return null
    return selectedNode ?? currentNode ?? manifest.tree
  }, [manifest, selectedNode, currentNode])

  const navigateToPath = useCallback(
    (path: string, selectId?: string | null) => {
      setCurrentPath(path)
      setSearchQuery('')
      setMetadataTarget(null)
      setSaveError(null)
      setFileView(null)
      if (selectId !== undefined) setSelectedId(selectId)
    },
    [setCurrentPath, setSearchQuery, setSelectedId],
  )

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
      target={fileView}
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
      currentPath={currentPath}
      onNavigate={(path) => navigateToPath(path, null)}
      onSelectEntry={setSelectedId}
      selectedId={selectedId}
      searchQuery={searchQuery}
      searchResults={searchResults}
      indexedFilePaths={indexedFilePaths}
      hasSidecar={hasSidecar}
      onOpenViewer={openViewer}
      onFileContextMenu={setContextMenu}
    />
  )

  return (
    <div className="flex min-h-svh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
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
      />

      {needsFolderReconnect && manifest && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <span>
            Ordner <strong className="font-medium">{manifest.rootName}</strong> ist im Index, aber
            nach dem Reload sind die Datei-Inhalte noch nicht angebunden.
          </span>
          <button
            type="button"
            onClick={() => {
              if (supportsFsPicker) void reconnectLastFolder()
              else fallbackInputRef.current?.click()
            }}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
          >
            Ordner erneut verbinden
          </button>
        </div>
      )}

      {!manifest ? (
        <Welcome
          onOpenFolder={handleOpenFolder}
          onFallback={() => fallbackInputRef.current?.click()}
          supportsFsPicker={supportsFsPicker}
          loading={indexing || !sessionReady}
          error={progress.phase === 'error' ? progress.message : undefined}
        />
      ) : (
        <div
          className={`grid min-h-0 flex-1 grid-cols-1 ${
            viewerPinned ? 'lg:grid-cols-[240px_1fr_minmax(340px,38vw)]' : 'lg:grid-cols-[240px_1fr_320px]'
          }`}
        >
          <TreeNav
            root={manifest.tree}
            currentPath={currentPath}
            onSelectPath={(path, nodeId) => navigateToPath(path, nodeId)}
          />
          {centerPane}
          <DetailPanel
            manifest={manifest}
            node={inspectNode}
            jsonPreview={jsonPreview}
            viewerPinned={viewerPinned}
            onViewerPinnedChange={setViewerPinned}
            viewerSlot={
              viewerPinned && fileView ? (
                <FileViewerRouter
                  target={fileView}
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
          />
        </div>
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
      />
    </div>
  )
}

export default App