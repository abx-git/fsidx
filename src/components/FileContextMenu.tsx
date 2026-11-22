import { FileJson, FileText, Pencil } from 'lucide-react'
import { useEffect, useRef } from 'react'

export interface ContextMenuTarget {
  id: string
  path: string
  name: string
  kind: 'file' | 'directory'
  extension?: string
  x: number
  y: number
}

interface FileContextMenuProps {
  target: ContextMenuTarget | null
  onClose: () => void
  hasSidecar: boolean
  canWrite: boolean
  onCreateOrEditMetadata: () => void
  onOpenMarkdown?: () => void
}

export function FileContextMenu({
  target,
  onClose,
  hasSidecar,
  canWrite,
  onCreateOrEditMetadata,
  onOpenMarkdown,
}: FileContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!target) return
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [target, onClose])

  if (!target || target.kind !== 'file') return null

  const isMd =
    target.extension === 'md' ||
    target.extension === 'markdown' ||
    target.name.toLowerCase().endsWith('.md')

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[220px] rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      style={{ left: target.x, top: target.y }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => {
          onCreateOrEditMetadata()
          onClose()
        }}
      >
        {hasSidecar ? (
          <Pencil className="h-4 w-4 text-violet-500" />
        ) : (
          <FileJson className="h-4 w-4 text-violet-500" />
        )}
        {hasSidecar ? 'Metadaten bearbeiten' : 'Metadaten-JSON erstellen'}
      </button>
      {!canWrite && (
        <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-amber-700 dark:border-zinc-800 dark:text-amber-300">
          Schreiben: Ordner mit Chrome/Edge (read/write) öffnen.
        </p>
      )}
      {isMd && onOpenMarkdown && (
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => {
            onOpenMarkdown()
            onClose()
          }}
        >
          <FileText className="h-4 w-4 text-emerald-500" />
          Markdown öffnen
        </button>
      )}
    </div>
  )
}