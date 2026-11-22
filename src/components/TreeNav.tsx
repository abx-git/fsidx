import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import { useState } from 'react'
import type { IndexNode } from '../types'

interface TreeNavProps {
  root: IndexNode
  currentPath: string
  onSelectPath: (path: string) => void
}

function TreeNode({
  node,
  currentPath,
  onSelectPath,
  defaultOpen,
}: {
  node: IndexNode
  currentPath: string
  onSelectPath: (path: string) => void
  defaultOpen?: boolean
}) {
  const isDir = node.kind === 'directory'
  const [open, setOpen] = useState(defaultOpen ?? node.depth < 2)
  const isActive = currentPath === node.path
  const hasChildren = (node.children?.length ?? 0) > 0

  if (!isDir) return null

  return (
    <div className="select-none">
      <button
        type="button"
        onClick={() => {
          onSelectPath(node.path)
          if (hasChildren) setOpen((v) => !v)
        }}
        className={`flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          isActive ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100' : 'text-zinc-700 dark:text-zinc-300'
        }`}
        style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
          )
        ) : (
          <span className="inline-block w-3.5" />
        )}
        <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span className="truncate">{node.name || '(root)'}</span>
      </button>
      {open &&
        node.children?.map((child) =>
          child.kind === 'directory' ? (
            <TreeNode
              key={child.id}
              node={child}
              currentPath={currentPath}
              onSelectPath={onSelectPath}
            />
          ) : null,
        )}
    </div>
  )
}

export function TreeNav({ root, currentPath, onSelectPath }: TreeNavProps) {
  return (
    <nav className="h-full overflow-auto border-r border-zinc-200 p-2 dark:border-zinc-800" aria-label="Folder tree">
      <TreeNode node={root} currentPath={currentPath} onSelectPath={onSelectPath} defaultOpen />
    </nav>
  )
}

export function pathBreadcrumbs(path: string, rootName: string): { label: string; path: string }[] {
  if (!path) return [{ label: rootName, path: '' }]
  const crumbs: { label: string; path: string }[] = [{ label: rootName, path: '' }]
  const parts = path.split('/')
  let built = ''
  for (const part of parts) {
    built = built ? `${built}/${part}` : part
    crumbs.push({ label: part, path: built })
  }
  return crumbs
}

export function FileIcon() {
  return <File className="h-4 w-4 shrink-0 text-sky-500" />
}