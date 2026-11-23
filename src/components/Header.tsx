import {
  FolderOpen,
  FileJson,
  Search,
  Trash2,
  Download,
  Upload,
  ListTodo,
  Files,
  Import,
} from 'lucide-react'
import type { FileIndexManifest } from '../types'
import { downloadManifestJson } from '../lib/build-manifest'

export type CenterPaneMode = 'files' | 'tasks'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onOpenFolder: () => void
  onFallbackInput: () => void
  onImportJson: () => void
  onClear: () => void
  manifest: FileIndexManifest | null
  supportsFsPicker: boolean
  indexing: boolean
  centerMode: CenterPaneMode
  onCenterModeChange: (mode: CenterPaneMode) => void
  showEt2DotFiles: boolean
  onShowEt2DotFilesChange: (value: boolean) => void
  onEt2Migrate: () => void
}

export function Header({
  searchQuery,
  onSearchChange,
  onOpenFolder,
  onFallbackInput,
  onImportJson,
  onClear,
  manifest,
  supportsFsPicker,
  indexing,
  centerMode,
  onCenterModeChange,
  showEt2DotFiles,
  onShowEt2DotFilesChange,
  onEt2Migrate,
}: HeaderProps) {
  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            LocalDir Index
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Browser-only folder indexer — metadata lives in JSON, no server.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {supportsFsPicker ? (
            <button
              type="button"
              disabled={indexing}
              onClick={onOpenFolder}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <FolderOpen className="h-4 w-4" />
              Open folder
            </button>
          ) : (
            <button
              type="button"
              disabled={indexing}
              onClick={onFallbackInput}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <FolderOpen className="h-4 w-4" />
              Choose folder
            </button>
          )}
          <button
            type="button"
            onClick={onImportJson}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <Upload className="h-4 w-4" />
            Import JSON
          </button>
          {manifest && (
            <>
              <button
                type="button"
                onClick={() => downloadManifestJson(manifest)}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </button>
            </>
          )}
        </div>
      </div>
      {manifest && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="inline-flex shrink-0 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => onCenterModeChange('files')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                centerMode === 'files'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              <Files className="h-3.5 w-3.5" />
              Dateien
            </button>
            <button
              type="button"
              onClick={() => onCenterModeChange('tasks')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                centerMode === 'tasks'
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              <ListTodo className="h-3.5 w-3.5" />
              Aufgaben
            </button>
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder="Suche im aktuellen Scope…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 py-2 pl-10 pr-3 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={showEt2DotFiles}
              onChange={(e) => onShowEt2DotFilesChange(e.target.checked)}
              className="rounded border-zinc-300"
            />
            .et2 anzeigen
          </label>
          <button
            type="button"
            onClick={onEt2Migrate}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs text-violet-800 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-950/40"
          >
            <Import className="h-3.5 w-3.5" />
            ET2 import
          </button>
        </div>
      )}
      {manifest && (
        <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <FileJson className="h-3.5 w-3.5" />
            Root: <strong className="font-medium text-zinc-700 dark:text-zinc-200">{manifest.rootName}</strong>
          </span>
          <span>{manifest.stats.files} files</span>
          <span>{manifest.stats.directories} folders</span>
          <span>{manifest.entries.length} indexed nodes</span>
        </div>
      )}
    </header>
  )
}