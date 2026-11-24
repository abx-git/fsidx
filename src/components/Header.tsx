import {
  FolderOpen,
  FileJson,
  Search,
  Trash2,
  Download,
  Upload,
  Import,
} from 'lucide-react'
import type { FileIndexManifest } from '../types'
import { downloadManifestJson } from '../lib/build-manifest'
import { CollapsibleSection } from './ui/CollapsibleSection'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  searchTasksOnly?: boolean
  onSearchTasksOnlyChange?: (value: boolean) => void
  onOpenFolder: () => void
  onFallbackInput: () => void
  onImportJson: () => void
  onClear: () => void
  manifest: FileIndexManifest | null
  supportsFsPicker: boolean
  indexing: boolean
  showEt2DotFiles: boolean
  onShowEt2DotFilesChange: (value: boolean) => void
  /** Nur wenn der Workspace alte `.et2/`-Strukturen enthält. */
  hasLegacyEt2?: boolean
  onEt2Migrate: () => void
}

export function Header({
  searchQuery,
  onSearchChange,
  searchTasksOnly = false,
  onSearchTasksOnlyChange,
  onOpenFolder,
  onFallbackInput,
  onImportJson,
  onClear,
  manifest,
  supportsFsPicker,
  indexing,
  showEt2DotFiles,
  onShowEt2DotFilesChange,
  hasLegacyEt2 = false,
  onEt2Migrate,
}: HeaderProps) {
  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            LocalDir Index
            {manifest && (
              <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">· {manifest.rootName}</span>
            )}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {supportsFsPicker ? (
            <button
              type="button"
              disabled={indexing}
              onClick={onOpenFolder}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <FolderOpen className="h-4 w-4" />
              Ordner öffnen
            </button>
          ) : (
            <button
              type="button"
              disabled={indexing}
              onClick={onFallbackInput}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <FolderOpen className="h-4 w-4" />
              Ordner wählen
            </button>
          )}
          <CollapsibleSection summary="Index &amp; Werkzeuge" className="rounded-lg border border-zinc-200 px-2 py-1 dark:border-zinc-700">
            <div className="flex flex-col gap-2 pb-1">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={onImportJson}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  <Upload className="h-3 w-3" />
                  Import
                </button>
                {manifest && (
                  <>
                    <button
                      type="button"
                      onClick={() => downloadManifestJson(manifest)}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={onClear}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      Zurücksetzen
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onEt2Migrate}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-[11px] text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-200"
                >
                  <Import className="h-3 w-3" />
                  ET2-Import
                </button>
              </div>
              {(hasLegacyEt2 || showEt2DotFiles) && (
                <label
                  className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400"
                  title="Altes ET2-Format (.et2/tasks/, tasks.json). Neu: *.tsk.json im normalen Ordner — nur zum Migrieren oder Lesen einblenden."
                >
                  <input
                    type="checkbox"
                    checked={showEt2DotFiles}
                    onChange={(e) => onShowEt2DotFilesChange(e.target.checked)}
                    className="rounded border-zinc-300"
                  />
                  Legacy-Ordner <code className="text-[10px]">.et2</code> im Baum anzeigen
                </label>
              )}
              {manifest && (
                <p className="flex flex-wrap gap-3 text-[10px] text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <FileJson className="h-3 w-3" />
                    {manifest.stats.files} Dateien · {manifest.stats.directories} Ordner
                  </span>
                </p>
              )}
            </div>
          </CollapsibleSection>
        </div>
      </div>
      {manifest && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder={searchTasksOnly ? 'Aufgaben im Scope suchen…' : 'Suche im aktuellen Scope…'}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 py-1.5 pl-10 pr-3 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          {onSearchTasksOnlyChange && (
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-800"
                checked={searchTasksOnly}
                onChange={(e) => onSearchTasksOnlyChange(e.target.checked)}
              />
              Nur Aufgaben
            </label>
          )}
        </div>
      )}
    </header>
  )
}