import { FolderTree, Search, FileJson } from 'lucide-react'

interface WelcomeProps {
  onOpenFolder: () => void
  onFallback: () => void
  supportsFsPicker: boolean
  error?: string
  loading?: boolean
}

export function Welcome({
  onOpenFolder,
  onFallback,
  supportsFsPicker,
  error,
  loading,
}: WelcomeProps) {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-8 px-6 py-16 text-left">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Index a folder entirely in your browser
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Pick a directory on disk. The app walks every file, builds a hierarchical JSON manifest (tree + flat search
          index), and lets you browse and search without uploading anything or calling a backend.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <FolderTree className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Tree navigation</p>
          <p className="mt-1 text-xs text-zinc-500">Airbase-style hierarchy from a single JSON graph.</p>
        </li>
        <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <Search className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Instant search</p>
          <p className="mt-1 text-xs text-zinc-500">Query the flat `entries` list client-side.</p>
        </li>
        <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <FileJson className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Portable JSON</p>
          <p className="mt-1 text-xs text-zinc-500">Export or re-import the manifest anywhere.</p>
        </li>
      </ul>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={supportsFsPicker ? onOpenFolder : onFallback}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? 'Indexing…' : 'Choose a folder'}
        </button>
        {supportsFsPicker && (
          <button
            type="button"
            disabled={loading}
            onClick={onFallback}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Legacy folder picker
          </button>
        )}
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}
      <p className="text-xs text-zinc-400">
        Chrome and Edge support the File System Access API. Firefox and Safari can use the legacy folder input. Files
        never leave your machine.
      </p>
    </main>
  )
}