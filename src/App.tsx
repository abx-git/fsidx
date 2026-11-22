import { useCallback, useMemo, useRef, useState } from 'react'
import { findNodeByPath } from './lib/build-manifest'
import { canWriteToStore, isMarkdownPath } from './lib/file-sources'
import { sidecarPathForFile } from './lib/sidecar'
import { Header } from './components/Header'
import { TreeNav } from './components/TreeNav'
import { FileBrowser } from './components/FileBrowser'
import { DetailPanel } from './components/DetailPanel'
import { Welcome } from './components/Welcome'
import { MarkdownEditor } from './components/MarkdownEditor'
import { MetadataEditor } from './components/MetadataEditor'
import {
  FileContextMenu,
  type ContextMenuTarget,
} from './components/FileContextMenu'
import { useFileIndex } from './hooks/useFileIndex'
import { clearMarkdownDrafts, useMarkdownDocument } from './hooks/useMarkdownDocument'
import { clearSidecarDrafts, useSidecarMetadata } from './hooks/useSidecarMetadata'

function App() {
  const fallbackInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [openedMarkdownPath, setOpenedMarkdownPath] = useState<string | null>(null)
  const [metadataTarget, setMetadataTarget] = useState<{
    path: string
    name: string
    id: string
  } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

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
  } = useFileIndex()

  const markdown = useMarkdownDocument(openedMarkdownPath, fileSources)

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

  const jsonPreview = useMemo(() => {
    if (!manifest) return ''
    const target =
      selectedNode ?? findNodeByPath(manifest.tree, currentPath) ?? manifest.tree
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
  }, [manifest, selectedNode, currentPath])

  const openMarkdown = useCallback((path: string, id: string) => {
    if (!isMarkdownPath(path)) return
    setMetadataTarget(null)
    setSelectedId(id)
    setOpenedMarkdownPath(path)
    setSearchQuery('')
  }, [setSelectedId, setSearchQuery])

  const openMetadata = useCallback((path: string, name: string, id: string) => {
    setOpenedMarkdownPath(null)
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
      setOpenedMarkdownPath(null)
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
          setOpenedMarkdownPath(null)
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
    setOpenedMarkdownPath(null)
    setMetadataTarget(null)
    clearIndex()
  }, [clearIndex])

  const handleOpenFolder = useCallback(async () => {
    clearMarkdownDrafts()
    clearSidecarDrafts()
    setOpenedMarkdownPath(null)
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

  const openedFileName = openedMarkdownPath?.split('/').pop() ?? ''

  const centerPane = metadataTarget && sidecar.sidecarPath ? (
    <MetadataEditor
      targetPath={metadataTarget.path}
      targetName={metadataTarget.name}
      sidecarPath={sidecar.sidecarPath}
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
  ) : openedMarkdownPath ? (
    <MarkdownEditor
      fileName={openedFileName}
      filePath={openedMarkdownPath}
      content={markdown.content}
      onChange={markdown.updateContent}
      viewMode={markdown.viewMode}
      onViewModeChange={markdown.setViewMode}
      onToggleViewMode={markdown.toggleViewMode}
      loading={markdown.loading}
      error={markdown.error}
      dirty={markdown.dirty}
      onClose={() => setOpenedMarkdownPath(null)}
    />
  ) : (
    <FileBrowser
      rootName={manifest!.rootName}
      currentNode={currentNode}
      currentPath={currentPath}
      onNavigate={(path) => {
        setCurrentPath(path)
        setSearchQuery('')
      }}
      onSelectEntry={setSelectedId}
      selectedId={selectedId}
      searchQuery={searchQuery}
      searchResults={searchResults}
      indexedFilePaths={indexedFilePaths}
      hasSidecar={hasSidecar}
      onOpenMarkdown={openMarkdown}
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

      {!manifest ? (
        <Welcome
          onOpenFolder={handleOpenFolder}
          onFallback={() => fallbackInputRef.current?.click()}
          supportsFsPicker={supportsFsPicker}
          loading={indexing}
          error={progress.phase === 'error' ? progress.message : undefined}
        />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_1fr_320px]">
          <TreeNav
            root={manifest.tree}
            currentPath={currentPath}
            onSelectPath={(path) => {
              setCurrentPath(path)
              setSearchQuery('')
              setOpenedMarkdownPath(null)
              setMetadataTarget(null)
            }}
          />
          {centerPane}
          <DetailPanel manifest={manifest} node={selectedNode} jsonPreview={jsonPreview} />
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
        onOpenMarkdown={
          contextMenu && isMarkdownPath(contextMenu.path)
            ? () => openMarkdown(contextMenu.path, contextMenu.id)
            : undefined
        }
      />
    </div>
  )
}

export default App