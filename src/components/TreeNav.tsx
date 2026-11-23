import { ChevronDown, ChevronRight, CheckSquare, File, Folder } from 'lucide-react'
import { countEt2TasksInSubtree } from '../lib/et2/scan-folder-tasks'
import { isTaskFilePath } from '../lib/et2/paths'
import { shouldShowFileInTree, type TreeDisplayFilterState } from '../lib/tree-display-filter'
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
  selectedId: string | null
  filter: TreeDisplayFilterState
  onFilterShowFiles: (value: boolean) => void
  onFilterShowTasks: (value: boolean) => void
  showEt2DotFiles: boolean
  onSelectPath: (path: string, nodeId: string) => void
  onSelectFile: (path: string, nodeId: string) => void
  indexedFilePaths?: string[]
  taskTitleByPath?: Map<string, string>
}

interface TreeNodeProps {
  node: IndexNode
  currentPath: string
  selectedId: string | null
  filter: TreeDisplayFilterState
  showEt2DotFiles: boolean
  onSelectPath: (path: string, nodeId: string) => void
  onSelectFile: (path: string, nodeId: string) => void
  indexedFilePaths?: string[]
  taskTitleByPath?: Map<string, string>
  expandedPaths: Set<string>
  onToggleExpanded: (path: string) => void
  depthOffset: number
}

function dirHasVisibleDescendants(
  node: IndexNode,
  filter: TreeDisplayFilterState,
  showEt2DotFiles: boolean,
): boolean {
  for (const child of node.children ?? []) {
    if (child.kind === 'directory') {
      if (dirHasVisibleDescendants(child, filter, showEt2DotFiles)) return true
    } else if (shouldShowFileInTree(child.path, filter, showEt2DotFiles)) {
      return true
    }
  }
  return false
}

function TreeNode({
  node,
  currentPath,
  selectedId,
  filter,
  showEt2DotFiles,
  onSelectPath,
  onSelectFile,
  indexedFilePaths,
  taskTitleByPath,
  expandedPaths,
  onToggleExpanded,
  depthOffset,
}: TreeNodeProps) {
  const indent = Math.max(0, node.depth - depthOffset) * 12 + 4

  if (node.kind === 'file') {
    if (!shouldShowFileInTree(node.path, filter, showEt2DotFiles)) return null
    const isTask = isTaskFilePath(node.path)
    const label = isTask
      ? (taskTitleByPath?.get(node.path) ?? node.name.replace(/\.task\.md$/, ''))
      : node.name
    const selected = selectedId === node.id
    return (
      <button
        type="button"
        onClick={() => onSelectFile(node.path, node.id)}
        className={`flex w-full items-center gap-1 rounded-md py-1 pr-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          selected
            ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100'
            : 'text-zinc-700 dark:text-zinc-300'
        }`}
        style={{ paddingLeft: `${indent + 28}px` }}
      >
        {isTask ? (
          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-violet-500" />
        ) : (
          <File className="h-3.5 w-3.5 shrink-0 text-sky-500" />
        )}
        <span className="truncate">{label}</span>
      </button>
    )
  }

  if (node.kind !== 'directory') return null

  const taskCount =
    indexedFilePaths && node.path !== undefined
      ? countEt2TasksInSubtree(indexedFilePaths, node.path)
      : 0
  const open = expandedPaths.has(node.path)
  const isActive = currentPath === node.path
  const children = node.children ?? []
  const visibleChildren = children.filter((child) =>
    child.kind === 'directory'
      ? dirHasVisibleDescendants(child, filter, showEt2DotFiles)
      : shouldShowFileInTree(child.path, filter, showEt2DotFiles),
  )
  const hasChildren = visibleChildren.length > 0
  const isRoot = node.path === ''

  if (!isRoot && !hasChildren) return null

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
          {taskCount > 0 && !filter.showFiles && !filter.showTasks && (
            <span
              className="ml-auto inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 text-[10px] font-medium text-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
              title={`${taskCount} Aufgaben im Teilbaum`}
            >
              <CheckSquare className="h-2.5 w-2.5" />
              {taskCount}
            </span>
          )}
        </button>
      </div>
      {open &&
        visibleChildren.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            currentPath={currentPath}
            selectedId={selectedId}
            filter={filter}
            showEt2DotFiles={showEt2DotFiles}
            onSelectPath={onSelectPath}
            onSelectFile={onSelectFile}
            indexedFilePaths={indexedFilePaths}
            taskTitleByPath={taskTitleByPath}
            expandedPaths={expandedPaths}
            onToggleExpanded={onToggleExpanded}
            depthOffset={depthOffset}
          />
        ))}
    </div>
  )
}

export function TreeNav({
  root,
  rootName,
  currentPath,
  selectedId,
  filter,
  onFilterShowFiles,
  onFilterShowTasks,
  showEt2DotFiles,
  onSelectPath,
  onSelectFile,
  indexedFilePaths,
  taskTitleByPath,
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

  const showAll = !filter.showFiles && !filter.showTasks

  return (
    <nav
      className="flex h-full min-h-0 w-full flex-col border-r border-zinc-200 dark:border-zinc-800"
      aria-label="Ordnerbaum"
    >
      <div className="shrink-0 space-y-2 border-b border-zinc-100 px-2 py-2 dark:border-zinc-800">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Ordnerbaum</p>
        <div className="flex flex-wrap gap-2 px-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-zinc-300"
              checked={filter.showFiles}
              onChange={(e) => onFilterShowFiles(e.target.checked)}
            />
            <File className="h-3 w-3 text-sky-500" />
            Dateien
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-zinc-300"
              checked={filter.showTasks}
              onChange={(e) => onFilterShowTasks(e.target.checked)}
            />
            <CheckSquare className="h-3 w-3 text-violet-500" />
            Aufgaben
          </label>
        </div>
        <p className="px-1 text-[10px] leading-snug text-zinc-500">
          {showAll
            ? 'Kein Filter aktiv — Ordner und alle Dateien sichtbar.'
            : filter.showFiles && filter.showTasks
              ? 'Nur Dateien und Aufgaben im Baum.'
              : filter.showFiles
                ? 'Nur normale Dateien (keine Aufgaben).'
                : 'Nur Aufgaben (.task.md).'}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        <TreeNode
          node={root}
          currentPath={currentPath}
          selectedId={selectedId}
          filter={filter}
          showEt2DotFiles={showEt2DotFiles}
          onSelectPath={onSelectPath}
          onSelectFile={onSelectFile}
          indexedFilePaths={indexedFilePaths}
          taskTitleByPath={taskTitleByPath}
          expandedPaths={expandedPaths}
          onToggleExpanded={onToggleExpanded}
          depthOffset={root.depth}
        />
      </div>
    </nav>
  )
}