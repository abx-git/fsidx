import {
  FolderOpen,
  FileJson,
  Search,
  Trash2,
  Download,
  Upload,
} from 'lucide-react'
import type { FileIndexManifest } from '../types'
import { downloadManifestJson } from '../lib/build-manifest'

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
}: HeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
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
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search files and folders…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-zinc-50 py-2 pl-10 pr-3 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
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