import { ChevronDown, ChevronRight, CheckSquare, File, Folder } from 'lucide-react'
import { countEt2TasksInSubtree } from '../lib/et2/scan-folder-tasks'
import { useCallback, useState } from 'react'
import type { IndexNode } from '../types'

const TREE_EXPANDED_KEY = 'fsidx.treeExpanded'

function readExpandedPaths(rootName: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(`${TREE_EXPANDED_KEY}:${rootName}`)
    if (raw) {
      const arr = JSON.parse(raw) as string[]
      return new Set(arr)
    }
  } catch {
    /* ignore */
  }
  return new Set([''])
}

function persistExpandedPaths(rootName: string, paths: Set<string>): void {
  try {
    sessionStorage.setItem(`${TREE_EXPANDED_KEY}:${rootName}`, JSON.stringify([...paths]))
  } catch {
    /* ignore */
  }
}

interface TreeNavProps {
  root: IndexNode
  rootName: string
  currentPath: string
  onSelectPath: (path: string, nodeId: string) => void
  indexedFilePaths?: string[]
}

interface TreeNodeProps {
  node: IndexNode
  currentPath: string
  onSelectPath: (path: string, nodeId: string) => void
  indexedFilePaths?: string[]
  expandedPaths: Set<string>
  onToggleExpanded: (path: string) => void
  depthOffset: number
}

function TreeNode({
  node,
  currentPath,
  onSelectPath,
  indexedFilePaths,
  expandedPaths,
  onToggleExpanded,
  depthOffset,
}: TreeNodeProps) {
  const taskCount =
    indexedFilePaths && node.path !== undefined
      ? countEt2TasksInSubtree(indexedFilePaths, node.path)
      : 0
  const isDir = node.kind === 'directory'
  const open = expandedPaths.has(node.path)
  const isActive = currentPath === node.path
  const hasChildren = (node.children?.length ?? 0) > 0
  const indent = Math.max(0, node.depth - depthOffset) * 12 + 4

  if (!isDir) return null

  return (
    <div className="select-none">
      <div
        className={`flex w-full items-center gap-0.5 rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          isActive
            ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100'
            : 'text-zinc-700 dark:text-zinc-300'
        }`}
        style={{ paddingLeft: `${indent}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? 'Einklappen' : 'Aufklappen'}
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpanded(node.path)
            }}
            className="rounded p-1 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80"
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
            )}
          </button>
        ) : (
          <span className="inline-block w-7" />
        )}
        <button
          type="button"
          onClick={() => onSelectPath(node.path, node.id)}
          className="flex min-w-0 flex-1 items-center gap-1 rounded-md py-1 pr-2 text-left"
        >
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="truncate">{node.name || '(root)'}</span>
          {taskCount > 0 && (
            <span
              className="ml-auto inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 text-[10px] font-medium text-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
              title={`${taskCount} Aufgaben`}
            >
              <CheckSquare className="h-2.5 w-2.5" />
              {taskCount}
            </span>
          )}
        </button>
      </div>
      {open &&
        node.children?.map((child) =>
          child.kind === 'directory' ? (
            <TreeNode
              key={child.id}
              node={child}
              currentPath={currentPath}
              onSelectPath={onSelectPath}
              indexedFilePaths={indexedFilePaths}
              expandedPaths={expandedPaths}
              onToggleExpanded={onToggleExpanded}
              depthOffset={depthOffset}
            />
          ) : null,
        )}
    </div>
  )
}

export function TreeNav({
  root,
  rootName,
  currentPath,
  onSelectPath,
  indexedFilePaths,
}: TreeNavProps) {
  const [expandedPaths, setExpandedPaths] = useState(() => readExpandedPaths(rootName))

  const onToggleExpanded = useCallback(
    (path: string) => {
      setExpandedPaths((prev) => {
        const next = new Set(prev)
        if (next.has(path)) next.delete(path)
        else next.add(path)
        persistExpandedPaths(rootName, next)
        return next
      })
    },
    [rootName],
  )

  return (
    <nav
      className="flex h-full min-h-0 w-full flex-col border-r border-zinc-200 dark:border-zinc-800"
      aria-label="Ordnerbaum"
    >
      <p className="shrink-0 border-b border-zinc-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
        Ordnerbaum
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        <TreeNode
          node={root}
          currentPath={currentPath}
          onSelectPath={onSelectPath}
          indexedFilePaths={indexedFilePaths}
          expandedPaths={expandedPaths}
          onToggleExpanded={onToggleExpanded}
          depthOffset={root.depth}
        />
      </div>
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