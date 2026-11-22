import { useCallback, useMemo, useRef } from 'react'
import { findNodeByPath } from './lib/build-manifest'
import { Header } from './components/Header'
import { TreeNav } from './components/TreeNav'
import { FileBrowser } from './components/FileBrowser'
import { DetailPanel } from './components/DetailPanel'
import { Welcome } from './components/Welcome'
import { useFileIndex } from './hooks/useFileIndex'

function App() {
  const fallbackInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const {
    manifest,
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
  } = useFileIndex()

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

  const onFallbackChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return
      const first = files[0] as File & { webkitRelativePath?: string }
      const rootName = first.webkitRelativePath?.split('/')[0] ?? 'Selected folder'
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

  const indexing =
    progress.phase === 'reading' || progress.phase === 'building'

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
        onOpenFolder={indexFromPicker}
        onFallbackInput={() => fallbackInputRef.current?.click()}
        onImportJson={() => importInputRef.current?.click()}
        onClear={clearIndex}
        manifest={manifest}
        supportsFsPicker={supportsFsPicker}
        indexing={indexing}
      />

      {!manifest ? (
        <Welcome
          onOpenFolder={indexFromPicker}
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
            }}
          />
          <FileBrowser
            rootName={manifest.rootName}
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
          />
          <DetailPanel manifest={manifest} node={selectedNode} jsonPreview={jsonPreview} />
        </div>
      )}
    </div>
  )
}

export default App