import { ChevronDown, ChevronRight, CheckSquare, Folder, Lock, Shield } from 'lucide-react'
import { isVaultUnlocked } from '../lib/vault/vault-session'
import { countEt2TasksInSubtree } from '../lib/et2/scan-folder-tasks'
import { shouldShowDirectoryInTree } from '../lib/tree-display-filter'
import { flattenVisibleTree, isDirectoryVisibleInTree } from '../lib/tree-flat'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IndexNode } from '../types'
import { fsidxFileDragMime, parseFsidxFileDrag } from '../lib/move-workspace'
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
  showEt2DotFiles: boolean
  onSelectPath: (path: string, nodeId: string) => void
  indexedFilePaths?: string[]
  onContextMenu?: (target: ContextMenuTarget) => void
  canWrite?: boolean
  onDropFileToDir?: (filePath: string, destDirPath: string) => void
  vaultRoots?: string[]
}

interface TreeNodeProps {
  node: IndexNode
  currentPath: string
  focusedId: string | null
  showEt2DotFiles: boolean
  onSelectPath: (path: string, nodeId: string) => void
  onTreeKeyDown: (e: React.KeyboardEvent, nodeId: string) => void
  onFocusItem: (nodeId: string) => void
  registerItemRef: (nodeId: string, el: HTMLElement | null) => void
  indexedFilePaths?: string[]
  expandedPaths: Set<string>
  onToggleExpanded: (path: string) => void
  depthOffset: number
  onContextMenu?: (target: ContextMenuTarget) => void
  canWrite?: boolean
  dropTargetPath: string | null
  onDropTargetPath: (path: string | null) => void
  onDropFileToDir?: (filePath: string, destDirPath: string) => void
  vaultRoots?: string[]
}

function TreeNode({
  node,
  currentPath,
  focusedId,
  showEt2DotFiles,
  onSelectPath,
  onTreeKeyDown,
  onFocusItem,
  registerItemRef,
  indexedFilePaths,
  expandedPaths,
  onToggleExpanded,
  depthOffset,
  onContextMenu,
  canWrite = false,
  dropTargetPath,
  onDropTargetPath,
  onDropFileToDir,
  vaultRoots = [],
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

  if (node.kind !== 'directory') return null
  if (!shouldShowDirectoryInTree(node.path, showEt2DotFiles)) return null

  const taskCount =
    indexedFilePaths && node.path !== undefined
      ? countEt2TasksInSubtree(indexedFilePaths, node.path)
      : 0
  const open = expandedPaths.has(node.path)
  const isActive = currentPath === node.path
  const children = node.children ?? []
  const visibleChildren = children.filter(
    (child) => child.kind === 'directory' && isDirectoryVisibleInTree(child, showEt2DotFiles),
  )
  const hasChildren = visibleChildren.length > 0
  const isRoot = node.path === ''
  const isVaultDir = vaultRoots.includes(node.path)
  const vaultLocked = isVaultDir && !isVaultUnlocked(node.path)
  const workspaceIsVaultRoot = isRoot && vaultRoots.includes('')
  const isDropTarget = canWrite && dropTargetPath === node.path

  const acceptFileDrop = (e: React.DragEvent) => {
    if (!canWrite || !onDropFileToDir) return false
    return e.dataTransfer.types.includes(fsidxFileDragMime())
  }

  if (!isRoot && !isDirectoryVisibleInTree(node, showEt2DotFiles)) return null

  return (
    <div className="select-none" role="group">
      <div
        className={`flex w-full items-center gap-0.5 rounded-md text-sm ${
          isVaultDir || workspaceIsVaultRoot
            ? vaultLocked
              ? 'border border-blue-200/90 bg-blue-50/70 hover:bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/35'
              : 'border border-blue-100 bg-blue-50/40 hover:bg-blue-50/70 dark:border-blue-900/30 dark:bg-blue-950/25'
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
        } ${
          isDropTarget
            ? 'bg-sky-100 ring-2 ring-inset ring-sky-400 dark:bg-sky-950/40 dark:ring-sky-500'
            : isActive
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100'
              : !isVaultDir && !workspaceIsVaultRoot
                ? 'text-zinc-700 dark:text-zinc-300'
                : 'text-blue-950 dark:text-blue-100'
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
          onDragOver={(e) => {
            if (!acceptFileDrop(e)) return
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
            onDropTargetPath(node.path)
          }}
          onDragLeave={(e) => {
            if (!acceptFileDrop(e)) return
            if (e.currentTarget.contains(e.relatedTarget as Node)) return
            if (dropTargetPath === node.path) onDropTargetPath(null)
          }}
          onDrop={(e) => {
            if (!acceptFileDrop(e)) return
            e.preventDefault()
            e.stopPropagation()
            onDropTargetPath(null)
            const payload = parseFsidxFileDrag(e.dataTransfer.getData(fsidxFileDragMime()))
            if (payload) onDropFileToDir?.(payload.path, node.path)
          }}
          className={`flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-md py-1 pr-2 text-left outline-none ${focusClass}`}
        >
          {isVaultDir || workspaceIsVaultRoot ? (
            <Shield className="h-3.5 w-3.5 shrink-0 text-blue-800 dark:text-blue-300" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          )}
          <span className="truncate">{node.name || '(root)'}</span>
          {(isVaultDir || workspaceIsVaultRoot) && (
            <span
              className={`shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase tracking-wide ${
                vaultLocked
                  ? 'bg-blue-200 text-blue-950 dark:bg-blue-900 dark:text-blue-100'
                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
              }`}
            >
              {vaultLocked ? (
                <span className="inline-flex items-center gap-0.5">
                  <Lock className="h-2.5 w-2.5" aria-hidden />
                  Tresor
                </span>
              ) : (
                'Tresor · offen'
              )}
            </span>
          )}
          {taskCount > 0 && (
            <span
              className="ml-auto inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 text-[10px] font-medium text-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
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
            focusedId={focusedId}
            showEt2DotFiles={showEt2DotFiles}
            onSelectPath={onSelectPath}
            onTreeKeyDown={onTreeKeyDown}
            onFocusItem={onFocusItem}
            registerItemRef={registerItemRef}
            indexedFilePaths={indexedFilePaths}
            expandedPaths={expandedPaths}
            onToggleExpanded={onToggleExpanded}
            depthOffset={depthOffset}
            onContextMenu={onContextMenu}
            canWrite={canWrite}
            dropTargetPath={dropTargetPath}
            onDropTargetPath={onDropTargetPath}
            onDropFileToDir={onDropFileToDir}
            vaultRoots={vaultRoots}
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
  showEt2DotFiles,
  onSelectPath,
  indexedFilePaths,
  onContextMenu,
  canWrite = false,
  onDropFileToDir,
  vaultRoots = [],
}: TreeNavProps) {
  const [expandedPaths, setExpandedPaths] = useState(() => readExpandedPaths(rootName))
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null)
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
    () => flattenVisibleTree(root, expandedPaths, showEt2DotFiles),
    [root, expandedPaths, showEt2DotFiles],
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
      onSelectPath(row.path, row.id)
    },
    [onSelectPath],
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
          if (row.hasChildren) {
            if (!row.expanded) onToggleExpanded(row.path)
            else if (idx < flatRows.length - 1) focusRow(flatRows[idx + 1].id)
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (row.expanded) {
            onToggleExpanded(row.path)
          } else if (row.parentPath !== row.path) {
            const parent = flatRows.find((r) => r.path === row.parentPath)
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
        flatRows.find((r) => r.path === currentPath)?.id ??
        flatRows.find((r) => r.id === selectedId)?.id ??
        flatRows[0]?.id
      if (start) focusRow(start)
    }
  }

  return (
    <nav
      className="flex h-full min-h-0 w-full flex-col border-r border-zinc-200 dark:border-zinc-800"
      aria-label="Ordnerbaum"
    >
      <div className="shrink-0 border-b border-zinc-100 px-2 py-2 dark:border-zinc-800">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Ordnerbaum</p>
        {canWrite && (
          <p className="px-1 pt-0.5 text-[9px] text-zinc-400">Dateien aus der Liste hierher ziehen</p>
        )}
      </div>
      <div
        ref={treeScrollRef}
        role="tree"
        tabIndex={0}
        aria-label="Ordner"
        onKeyDown={onTreeContainerKeyDown}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return
          setDropTargetPath(null)
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 outline-none focus:ring-1 focus:ring-inset focus:ring-emerald-500/40"
      >
        <TreeNode
          node={root}
          currentPath={currentPath}
          focusedId={focusedId}
          showEt2DotFiles={showEt2DotFiles}
          onSelectPath={onSelectPath}
          onTreeKeyDown={onTreeKeyDown}
          onFocusItem={setFocusedId}
          registerItemRef={registerItemRef}
          indexedFilePaths={indexedFilePaths}
          expandedPaths={expandedPaths}
          onToggleExpanded={onToggleExpanded}
          depthOffset={root.depth}
          onContextMenu={onContextMenu}
          canWrite={canWrite}
          dropTargetPath={dropTargetPath}
          onDropTargetPath={setDropTargetPath}
          onDropFileToDir={onDropFileToDir}
          vaultRoots={vaultRoots}
        />
      </div>
    </nav>
  )
}