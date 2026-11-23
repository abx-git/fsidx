import { ChevronDown, ChevronRight, CheckSquare, File, Folder } from 'lucide-react'
import { countEt2TasksInSubtree } from '../lib/et2/scan-folder-tasks'
import { isTaskFilePath } from '../lib/et2/paths'
import { isTskJsonPath } from '../lib/et2/tsk-paths'
import {
  shouldShowDirectoryInTree,
  shouldShowFileInTree,
  type TreeDisplayFilterState,
} from '../lib/tree-display-filter'
import { directoryHasNavigableContent, flattenVisibleTree } from '../lib/tree-flat'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IndexNode } from '../types'
import type { ContextMenuTarget } from './FileContextMenu'

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
  onContextMenu?: (target: ContextMenuTarget) => void
}

interface TreeNodeProps {
  node: IndexNode
  currentPath: string
  selectedId: string | null
  focusedId: string | null
  filter: TreeDisplayFilterState
  showEt2DotFiles: boolean
  onSelectPath: (path: string, nodeId: string) => void
  onSelectFile: (path: string, nodeId: string) => void
  onTreeKeyDown: (e: React.KeyboardEvent, nodeId: string) => void
  onFocusItem: (nodeId: string) => void
  registerItemRef: (nodeId: string, el: HTMLElement | null) => void
  indexedFilePaths?: string[]
  taskTitleByPath?: Map<string, string>
  expandedPaths: Set<string>
  onToggleExpanded: (path: string) => void
  depthOffset: number
  onContextMenu?: (target: ContextMenuTarget) => void
}

function TreeNode({
  node,
  currentPath,
  selectedId,
  focusedId,
  filter,
  showEt2DotFiles,
  onSelectPath,
  onSelectFile,
  onTreeKeyDown,
  onFocusItem,
  registerItemRef,
  indexedFilePaths,
  taskTitleByPath,
  expandedPaths,
  onToggleExpanded,
  depthOffset,
  onContextMenu,
}: TreeNodeProps) {
  const emitContext = (e: React.MouseEvent) => {
    if (!onContextMenu) return
    e.preventDefault()
    e.stopPropagation()
    onContextMenu({
      id: node.id,
      path: node.path,
      name: node.kind === 'directory' && !node.name ? '(root)' : node.name,
      kind: node.kind,
      extension: node.extension,
      x: e.clientX,
      y: e.clientY,
    })
  }
  const indent = Math.max(0, node.depth - depthOffset) * 12 + 4
  const isFocused = focusedId === node.id
  const focusClass = isFocused ? 'ring-2 ring-emerald-500/50 ring-inset' : ''

  if (node.kind === 'file') {
    if (!shouldShowFileInTree(node.path, filter, showEt2DotFiles)) return null
    const isTask = isTaskFilePath(node.path) || isTskJsonPath(node.path)
    const label = isTaskFilePath(node.path)
      ? (taskTitleByPath?.get(node.path) ?? node.name.replace(/\.task\.md$/, ''))
      : isTskJsonPath(node.path)
        ? node.name
        : node.name
    const selected = selectedId === node.id
    return (
      <div
        role="treeitem"
        tabIndex={isFocused ? 0 : -1}
        ref={(el) => registerItemRef(node.id, el)}
        aria-selected={selected}
        onFocus={() => onFocusItem(node.id)}
        onKeyDown={(e) => onTreeKeyDown(e, node.id)}
        onClick={() => onSelectFile(node.path, node.id)}
        onContextMenu={emitContext}
        className={`flex w-full cursor-pointer items-center gap-1 rounded-md py-1 pr-2 text-left text-sm outline-none hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          selected
            ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100'
            : 'text-zinc-700 dark:text-zinc-300'
        } ${focusClass}`}
        style={{ paddingLeft: `${indent + 28}px` }}
      >
        {isTask ? (
          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-violet-500" />
        ) : (
          <File className="h-3.5 w-3.5 shrink-0 text-sky-500" />
        )}
        <span className="truncate">{label}</span>
      </div>
    )
  }

  if (node.kind !== 'directory') return null
  if (!shouldShowDirectoryInTree(node.path, showEt2DotFiles)) return null

  const taskCount =
    indexedFilePaths && node.path !== undefined
      ? countEt2TasksInSubtree(indexedFilePaths, node.path)
      : 0
  const open = expandedPaths.has(node.path)
  const isActive = currentPath === node.path
  const children = node.children ?? []
  const visibleChildren = children.filter((child) =>
    child.kind === 'directory'
      ? directoryHasNavigableContent(child, showEt2DotFiles)
      : shouldShowFileInTree(child.path, filter, showEt2DotFiles),
  )
  const hasChildren = visibleChildren.length > 0
  const isRoot = node.path === ''

  if (!isRoot && !directoryHasNavigableContent(node, showEt2DotFiles)) return null

  return (
    <div className="select-none" role="group">
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
            aria-hidden
            tabIndex={-1}
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
        <div
          role="treeitem"
          tabIndex={isFocused ? 0 : -1}
          ref={(el) => registerItemRef(node.id, el)}
          aria-expanded={hasChildren ? open : undefined}
          aria-selected={isActive}
          onFocus={() => onFocusItem(node.id)}
          onKeyDown={(e) => onTreeKeyDown(e, node.id)}
          onClick={() => onSelectPath(node.path, node.id)}
          onContextMenu={emitContext}
          className={`flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-md py-1 pr-2 text-left outline-none ${focusClass}`}
        >
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="truncate">{node.name || '(root)'}</span>
          {taskCount > 0 && !filter.showTasks && (
            <span
              className="ml-auto inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 text-[10px] font-medium text-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
              title={`${taskCount} Aufgaben im Teilbaum`}
            >
              <CheckSquare className="h-2.5 w-2.5" />
              {taskCount}
            </span>
          )}
        </div>
      </div>
      {open &&
        visibleChildren.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            currentPath={currentPath}
            selectedId={selectedId}
            focusedId={focusedId}
            filter={filter}
            showEt2DotFiles={showEt2DotFiles}
            onSelectPath={onSelectPath}
            onSelectFile={onSelectFile}
            onTreeKeyDown={onTreeKeyDown}
            onFocusItem={onFocusItem}
            registerItemRef={registerItemRef}
            indexedFilePaths={indexedFilePaths}
            taskTitleByPath={taskTitleByPath}
            expandedPaths={expandedPaths}
            onToggleExpanded={onToggleExpanded}
            depthOffset={depthOffset}
            onContextMenu={onContextMenu}
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
  onContextMenu,
}: TreeNavProps) {
  const [expandedPaths, setExpandedPaths] = useState(() => readExpandedPaths(rootName))
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const treeScrollRef = useRef<HTMLDivElement>(null)

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

  const flatRows = useMemo(
    () => flattenVisibleTree(root, expandedPaths, filter, showEt2DotFiles),
    [root, expandedPaths, filter, showEt2DotFiles],
  )

  const registerItemRef = useCallback((nodeId: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(nodeId, el)
    else itemRefs.current.delete(nodeId)
  }, [])

  const focusRow = useCallback((id: string) => {
    setFocusedId(id)
    const el = itemRefs.current.get(id)
    if (el) {
      el.focus({ preventScroll: false })
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [])

  const activateRow = useCallback(
    (row: (typeof flatRows)[0]) => {
      if (row.kind === 'directory') {
        onSelectPath(row.path, row.id)
      } else {
        onSelectFile(row.path, row.id)
      }
    },
    [onSelectPath, onSelectFile],
  )

  const onTreeKeyDown = useCallback(
    (e: React.KeyboardEvent, nodeId: string) => {
      const idx = flatRows.findIndex((r) => r.id === nodeId)
      if (idx < 0) return
      const row = flatRows[idx]

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (idx < flatRows.length - 1) focusRow(flatRows[idx + 1].id)
          break
        case 'ArrowUp':
          e.preventDefault()
          if (idx > 0) focusRow(flatRows[idx - 1].id)
          break
        case 'ArrowRight':
          e.preventDefault()
          if (row.kind === 'directory' && row.hasChildren) {
            if (!row.expanded) onToggleExpanded(row.path)
            else if (idx < flatRows.length - 1) focusRow(flatRows[idx + 1].id)
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (row.kind === 'directory' && row.expanded) {
            onToggleExpanded(row.path)
          } else if (row.parentPath !== row.path) {
            const parent = flatRows.find(
              (r) => r.kind === 'directory' && r.path === row.parentPath,
            )
            if (parent) focusRow(parent.id)
          }
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          activateRow(row)
          break
        case 'Home':
          e.preventDefault()
          if (flatRows[0]) focusRow(flatRows[0].id)
          break
        case 'End':
          e.preventDefault()
          if (flatRows.length > 0) focusRow(flatRows[flatRows.length - 1].id)
          break
        default:
          break
      }
    },
    [flatRows, focusRow, onToggleExpanded, activateRow],
  )

  useEffect(() => {
    if (focusedId && !flatRows.some((r) => r.id === focusedId)) {
      setFocusedId(flatRows[0]?.id ?? null)
    }
  }, [flatRows, focusedId])

  const onTreeContainerKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== treeScrollRef.current) return
    if (e.key === 'ArrowDown' || e.key === 'Down' || e.key === 'Enter') {
      e.preventDefault()
      const start =
        flatRows.find((r) => r.kind === 'directory' && r.path === currentPath)?.id ??
        flatRows.find((r) => r.id === selectedId)?.id ??
        flatRows[0]?.id
      if (start) focusRow(start)
    }
  }

  const foldersOnly = !filter.showFiles && !filter.showTasks

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
        <p className="px-1 text-[10px] text-zinc-500">
          {foldersOnly
            ? 'Nur Ordner — Dateien in der Liste (Mitte)'
            : filter.showTasks && !filter.showFiles
              ? 'Zusätzlich Aufgaben-Dateien (*.tsk.json …)'
              : filter.showFiles && !filter.showTasks
                ? 'Zusätzlich Dateien, ohne Aufgaben'
                : 'Ordner und alle Dateien im Baum'}
        </p>
      </div>
      <div
        ref={treeScrollRef}
        role="tree"
        tabIndex={0}
        aria-label={foldersOnly ? 'Ordner' : 'Ordner und Dateien'}
        onKeyDown={onTreeContainerKeyDown}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 outline-none focus:ring-1 focus:ring-inset focus:ring-emerald-500/40"
      >
        <TreeNode
          node={root}
          currentPath={currentPath}
          selectedId={selectedId}
          focusedId={focusedId}
          filter={filter}
          showEt2DotFiles={showEt2DotFiles}
          onSelectPath={onSelectPath}
          onSelectFile={onSelectFile}
          onTreeKeyDown={onTreeKeyDown}
          onFocusItem={setFocusedId}
          registerItemRef={registerItemRef}
          indexedFilePaths={indexedFilePaths}
          taskTitleByPath={taskTitleByPath}
          expandedPaths={expandedPaths}
          onToggleExpanded={onToggleExpanded}
          depthOffset={root.depth}
          onContextMenu={onContextMenu}
        />
      </div>
    </nav>
  )
}