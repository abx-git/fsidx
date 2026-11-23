import { FileText, FolderPlus } from 'lucide-react'

interface ScopeCreateActionsProps {
  canWrite: boolean
  onNewFolder: () => void
  onNewMarkdown: () => void
  compact?: boolean
}

export function ScopeCreateActions({
  canWrite,
  onNewFolder,
  onNewMarkdown,
  compact,
}: ScopeCreateActionsProps) {
  if (!canWrite) return null
  const btn =
    compact === true
      ? 'rounded-md px-2 py-1 text-[11px]'
      : 'rounded-lg px-2.5 py-1.5 text-xs'
  return (
    <div
      className={`flex flex-wrap items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2'
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Anlegen</span>
      <button
        type="button"
        onClick={onNewFolder}
        className={`inline-flex items-center gap-1 border border-zinc-200 bg-white font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${btn}`}
      >
        <FolderPlus className="h-3.5 w-3.5 text-amber-500" />
        Ordner
      </button>
      <button
        type="button"
        onClick={onNewMarkdown}
        className={`inline-flex items-center gap-1 border border-zinc-200 bg-white font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${btn}`}
      >
        <FileText className="h-3.5 w-3.5 text-sky-500" />
        Markdown
      </button>
    </div>
  )
}