import {
  ChevronRight,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  Terminal,
  Trash2,
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Et2TaskSummary } from '../../types/et2-task'
import { et2TaskStatusLabel } from '../../lib/et2/task-status-labels'
import { filterTasksForCollapsedTree } from '../../lib/et2/task-list-visibility'
import { formatDueHint, isDueOverdue, parseIsoDate } from '../../lib/et2/task-datetime'
import { formatEffortDisplay } from '../../lib/et2/task-effort'
import { getTaskCommand } from '../../lib/et2/task-command'
import { isTaskMarkedDone, tagChipClass, tagsWithoutCompletedTag } from '../../lib/et2/task-tags'
import { taskLinkHref } from '../../lib/et2/task-link'
import { collectDescendantTaskIds, taskHasChildren } from '../../lib/et2/task-bundle-ops'
import { DEFAULT_NEW_TASK_TITLE } from '../../lib/et2/constants'
import {
  handleEt2MindmapListKey,
  handleEt2MindmapNavigateKey,
  shouldHandleEt2TaskListShortcuts,
} from '../../lib/et2/task-list-keyboard'
import { taskRefFromPath } from '../../lib/et2/paths'
import type { Et2TaskRecord } from '../../types/et2-tasks-bundle'

const COLLAPSE_KEY = 'fsidx.tskCollapsed'

function readCollapsed(tskPath: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(`${COLLAPSE_KEY}:${tskPath}`)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    /* ignore */
  }
  return new Set()
}

function persistCollapsed(tskPath: string, ids: Set<string>): void {
  try {
    sessionStorage.setItem(`${COLLAPSE_KEY}:${tskPath}`, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

function asRecords(tasks: Et2TaskSummary[]): Et2TaskRecord[] {
  return tasks.map((t) => ({
    id: t.taskId,
    parentId: t.parentId,
    title: t.title,
    status: t.status ?? 'open',
  }))
}

interface Et2TaskListProps {
  tskPath: string
  tasks: Et2TaskSummary[]
  selectedTaskRef: string | null
  onSelectTask: (taskRef: string) => void
  onAddSubtask: (parentTaskId: string) => void
  /** Neue Aufgabe als Geschwister direkt unter `anchorTaskId`. */
  onAddSibling?: (anchorTaskId: string) => void
  onDeleteTask: (taskId: string) => void
  onReparentTask: (taskId: string) => void
  onNestTask?: (taskId: string, newParentId: string | null) => void
  onReorderTask?: (taskId: string, anchorTaskId: string, place: 'before' | 'after') => void
  onMoveSibling?: (taskId: string, direction: 'up' | 'down') => void
  onIndentTask?: (taskId: string) => void
  onOutdentTask?: (taskId: string) => void
  canWrite: boolean
  /** Titel der aktuell gewählten Aufgabe (Inline-Editor auf der Karte). */
  inlineTitle?: string
  onInlineTitleChange?: (value: string) => void
  titleFocusTick?: number
  onOpenTaskDetail?: (taskRef: string) => void
}

const rowMenuClass =
  'fixed z-[80] min-w-[11rem] rounded-md border border-zinc-200 bg-white py-0.5 text-[11px] shadow-lg dark:border-zinc-700 dark:bg-zinc-900'

type TaskDropTarget =
  | { kind: 'root' }
  | { kind: 'nest'; taskId: string }
  | { kind: 'before'; taskId: string }
  | { kind: 'after'; taskId: string }

function dropTargetKey(target: TaskDropTarget): string {
  if (target.kind === 'root') return 'root'
  return `${target.kind}:${target.taskId}`
}

function TaskDropGap({
  active,
  depth,
  label,
  onActivate,
  onDrop,
}: {
  active: boolean
  depth: number
  label: string
  onActivate: () => void
  onDrop: () => void
}) {
  return (
    <li
      className="list-none py-0.5"
      style={{ paddingLeft: `${0.5 + depth * 0.75}rem`, paddingRight: '0.5rem' }}
      onDragEnter={(e) => {
        e.preventDefault()
        onActivate()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onActivate()
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDrop()
      }}
    >
      <div
        className={`flex h-2 items-center rounded transition ${active ? '' : 'opacity-60'}`}
        title={label}
      >
        <div
          className={`h-0.5 w-full rounded-full transition ${
            active
              ? 'bg-violet-500 shadow-[0_0_0_2px] shadow-violet-300 dark:shadow-violet-600'
              : 'bg-violet-200/80 dark:bg-violet-800/60'
          }`}
        />
      </div>
    </li>
  )
}

export function Et2TaskList({
  tskPath,
  tasks,
  selectedTaskRef,
  onSelectTask,
  onAddSubtask,
  onAddSibling,
  onDeleteTask,
  onReparentTask,
  onNestTask,
  onReorderTask,
  onMoveSibling,
  onIndentTask,
  onOutdentTask,
  canWrite,
  inlineTitle,
  onInlineTitleChange,
  titleFocusTick = 0,
  onOpenTaskDetail,
}: Et2TaskListProps) {
  const [collapsedIds, setCollapsedIds] = useState(() => readCollapsed(tskPath))
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<TaskDropTarget | null>(null)
  /** Inline-Titel nur bei Doppelklick oder neuer Aufgabe (titleFocusTick). */
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listFocusRef = useRef<HTMLDivElement>(null)
  const inlineInputRef = useRef<HTMLInputElement>(null)
  const prevSelectedTaskRef = useRef<string | null>(null)
  const skipListFocusOnceRef = useRef(false)

  useEffect(() => {
    setCollapsedIds(readCollapsed(tskPath))
    setEditingTaskId(null)
  }, [tskPath])

  const focusList = useCallback(() => {
    listFocusRef.current?.focus({ preventScroll: true })
  }, [])

  const startInlineEdit = useCallback((taskId: string) => {
    setEditingTaskId(taskId)
    window.requestAnimationFrame(() => {
      inlineInputRef.current?.focus()
      const v = inlineInputRef.current?.value ?? ''
      if (!v.trim() || v === DEFAULT_NEW_TASK_TITLE) onInlineTitleChange?.('')
    })
  }, [onInlineTitleChange])

  useEffect(() => {
    if (!menuTaskId) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node | null
      if (menuRef.current?.contains(t)) return
      setMenuTaskId(null)
    }
    document.addEventListener('pointerdown', onDoc, true)
    return () => document.removeEventListener('pointerdown', onDoc, true)
  }, [menuTaskId])

  const visible = useMemo(
    () => filterTasksForCollapsedTree(tasks, collapsedIds),
    [tasks, collapsedIds],
  )

  const records = useMemo(() => asRecords(tasks), [tasks])

  const toggleCollapse = useCallback(
    (taskId: string) => {
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        if (next.has(taskId)) next.delete(taskId)
        else next.add(taskId)
        persistCollapsed(tskPath, next)
        return next
      })
    },
    [tskPath],
  )

  const openMenu = (taskId: string, pos: { top: number; left: number }) => {
    setMenuTaskId(taskId)
    setMenuPos(pos)
  }

  const selectedTaskId = useMemo(() => {
    if (!selectedTaskRef) return null
    return taskRefFromPath(selectedTaskRef)?.taskId ?? null
  }, [selectedTaskRef])

  const navigateVisible = useCallback(
    (direction: 'up' | 'down') => {
      const idx = visible.findIndex((t) => t.relativePath === selectedTaskRef)
      if (idx < 0) return
      const next = visible[idx + (direction === 'up' ? -1 : 1)]
      if (next) {
        onSelectTask(next.relativePath)
        setEditingTaskId(null)
        window.requestAnimationFrame(() => focusList())
      }
    },
    [visible, selectedTaskRef, onSelectTask, focusList],
  )

  const mindmapKeyCtx = useMemo(
    () => ({
      taskId: selectedTaskId,
      canWrite,
      onSibling: onAddSibling,
      onSubtask: onAddSubtask,
      onMoveSibling,
      onIndent: onIndentTask,
      onOutdent: onOutdentTask,
      onNavigate: navigateVisible,
    }),
    [
      selectedTaskId,
      canWrite,
      onAddSibling,
      onAddSubtask,
      onMoveSibling,
      onIndentTask,
      onOutdentTask,
      navigateVisible,
    ],
  )

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!shouldHandleEt2TaskListShortcuts(e.nativeEvent)) return
      if (handleEt2MindmapListKey(e.nativeEvent, mindmapKeyCtx)) return
      handleEt2MindmapNavigateKey(e.nativeEvent, mindmapKeyCtx)
    },
    [mindmapKeyCtx],
  )

  useEffect(() => {
    if (!titleFocusTick || !selectedTaskId) return
    skipListFocusOnceRef.current = true
    setEditingTaskId(selectedTaskId)
    window.setTimeout(() => startInlineEdit(selectedTaskId), 50)
  }, [titleFocusTick, selectedTaskId, startInlineEdit])

  useEffect(() => {
    if (editingTaskId && editingTaskId !== selectedTaskId) setEditingTaskId(null)
  }, [selectedTaskId, editingTaskId])

  useEffect(() => {
    if (prevSelectedTaskRef.current === selectedTaskRef) return
    prevSelectedTaskRef.current = selectedTaskRef
    if (skipListFocusOnceRef.current) {
      skipListFocusOnceRef.current = false
      return
    }
    if (!selectedTaskRef || editingTaskId) return
    const active = document.activeElement
    if (
      active instanceof HTMLElement &&
      active.closest('[data-et2-detail-field], [data-et2-task-list-menu], [data-et2-inline-title]')
    ) {
      return
    }
    window.requestAnimationFrame(() => focusList())
  }, [selectedTaskRef, editingTaskId, focusList])

  const canNestOn = useCallback(
    (targetId: string) => {
      if (!dragId || dragId === targetId) return false
      const descendants = collectDescendantTaskIds(records, dragId)
      return !descendants.has(targetId)
    },
    [dragId, records],
  )

  const canReorderAt = useCallback(
    (anchorTaskId: string) => {
      if (!dragId || dragId === anchorTaskId) return false
      const descendants = collectDescendantTaskIds(records, dragId)
      return !descendants.has(anchorTaskId)
    },
    [dragId, records],
  )

  const clearDrag = () => {
    setDragId(null)
    setDropTarget(null)
  }

  const activeKey = dropTarget ? dropTargetKey(dropTarget) : null

  return (
    <div
      ref={listFocusRef}
      data-et2-task-list
      tabIndex={0}
      className="outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300/50 dark:focus-visible:ring-violet-700/40"
      onKeyDown={handleListKeyDown}
    >
    <ul ref={listRef} className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {canWrite && dragId && (
        <li
          className="list-none px-2 py-0.5"
          title="Wurzelebene"
          onDragOver={(e) => {
            e.preventDefault()
            setDropTarget({ kind: 'root' })
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDropTarget({ kind: 'root' })
            if (!dragId) return
            onNestTask?.(dragId, null)
            clearDrag()
          }}
        >
          <div className="flex h-2 items-center">
            <div
              className={`h-0.5 w-full rounded-full transition ${
                activeKey === 'root'
                  ? 'bg-violet-500 shadow-[0_0_0_2px] shadow-violet-300 dark:shadow-violet-600'
                  : 'bg-violet-200/80 dark:bg-violet-800/60'
              }`}
            />
          </div>
        </li>
      )}
      {visible.map((task) => {
        const selected = selectedTaskRef === task.relativePath
        const depth = task.depth ?? 0
        const hasKids = taskHasChildren(task.taskId, records)
        const collapsed = collapsedIds.has(task.taskId)
        const done = isTaskMarkedDone(task)
        const due = parseIsoDate(task.dueDate)
        const dueHint = formatDueHint(due)
        const overdue = isDueOverdue(due, done)
        const href = taskLinkHref(task.link)
        const cmd = getTaskCommand(task.command)
        const effortLabel = formatEffortDisplay(task.effort, task.effortUnit)
        const visibleTags = tagsWithoutCompletedTag(task.tags ?? []).slice(0, 4)

        const nestHighlight =
          dropTarget?.kind === 'nest' && dropTarget.taskId === task.taskId
        const beforeKey = `before:${task.taskId}`
        const afterKey = `after:${task.taskId}`
        const inlineEditing = selected && editingTaskId === task.taskId
        return (
          <Fragment key={task.relativePath}>
            {canWrite && dragId && onReorderTask && canReorderAt(task.taskId) && (
              <TaskDropGap
                depth={depth}
                active={activeKey === beforeKey}
                label="Hier einfügen (gleiche Ebene)"
                onActivate={() => setDropTarget({ kind: 'before', taskId: task.taskId })}
                onDrop={() => {
                  if (!dragId) return
                  onReorderTask(dragId, task.taskId, 'before')
                  clearDrag()
                }}
              />
            )}
            <li
              onDragOver={(e) => {
                if (!dragId || !canNestOn(task.taskId)) return
                e.preventDefault()
                e.stopPropagation()
                setDropTarget({ kind: 'nest', taskId: task.taskId })
              }}
              onDrop={(e) => {
                if (!dragId || !canNestOn(task.taskId)) return
                e.preventDefault()
                e.stopPropagation()
                onNestTask?.(dragId, task.taskId)
                clearDrag()
              }}
            >
            <div
              className={`group flex items-stretch gap-0.5 text-left text-xs hover:bg-violet-50 dark:hover:bg-violet-950/30 ${
                selected ? 'bg-violet-100/80 dark:bg-violet-950/40' : ''
              } ${nestHighlight ? 'ring-2 ring-inset ring-violet-400 bg-violet-50/50 dark:bg-violet-950/20' : ''}`}
              style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
              onContextMenu={
                canWrite
                  ? (e) => {
                      e.preventDefault()
                      openMenu(task.taskId, { top: e.clientY, left: e.clientX })
                    }
                  : undefined
              }
            >
              {canWrite && (
                <span
                  draggable
                  title="Verschieben"
                  className="mt-2 flex h-5 w-4 shrink-0 cursor-grab items-center text-zinc-400 active:cursor-grabbing"
                  onDragStart={(e) => {
                    setDragId(task.taskId)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={clearDrag}
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
              )}
              {hasKids ? (
                <button
                  type="button"
                  className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-violet-100 dark:hover:bg-violet-900/50"
                  aria-expanded={!collapsed}
                  aria-label={collapsed ? 'Aufklappen' : 'Einklappen'}
                  onClick={() => toggleCollapse(task.taskId)}
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${collapsed ? '' : 'rotate-90'}`}
                  />
                </button>
              ) : (
                <span className="mt-1.5 inline-block h-6 w-6 shrink-0" />
              )}
              <div
                role="button"
                tabIndex={-1}
                className="min-w-0 flex-1 cursor-pointer py-2 pr-1 text-left"
                onClick={(e) => {
                  if (e.detail > 1) return
                  if (selectedTaskRef !== task.relativePath) onSelectTask(task.relativePath)
                  if (e.shiftKey) {
                    onOpenTaskDetail?.(task.relativePath)
                    return
                  }
                  if (editingTaskId !== task.taskId) {
                    setEditingTaskId(null)
                    focusList()
                  }
                }}
                onDoubleClick={(e) => {
                  e.preventDefault()
                  onSelectTask(task.relativePath)
                  if (canWrite && onInlineTitleChange) startInlineEdit(task.taskId)
                }}
              >
                {inlineEditing && canWrite && onInlineTitleChange ? (
                  <input
                    data-et2-inline-title
                    ref={inlineInputRef}
                    type="text"
                    className={`w-full min-w-0 rounded border border-violet-300 bg-white px-1 py-0.5 text-xs font-medium outline-none ring-violet-400 focus:ring-1 dark:border-violet-700 dark:bg-zinc-900/50 ${
                      done ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                    value={inlineTitle ?? task.title}
                    placeholder={DEFAULT_NEW_TASK_TITLE}
                    onChange={(e) => onInlineTitleChange(e.target.value)}
                    onKeyDown={handleListKeyDown}
                    onBlur={(e) => {
                      const next = e.relatedTarget
                      if (next instanceof Node && listFocusRef.current?.contains(next)) return
                      setEditingTaskId(null)
                      window.requestAnimationFrame(() => focusList())
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className={`block min-h-[1.375rem] truncate font-medium ${
                      done ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {task.title || DEFAULT_NEW_TASK_TITLE}
                  </span>
                )}
                {task.status && (
                  <span className="mt-0.5 inline-flex rounded-full bg-white/80 px-1 py-0.5 text-[9px] font-normal text-violet-800 dark:bg-zinc-900">
                    {et2TaskStatusLabel(task.status)}
                  </span>
                )}
                {(dueHint || effortLabel || visibleTags.length > 0 || href || cmd) && (
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
                    {dueHint && (
                      <span className={overdue ? 'font-medium text-red-600' : ''}>{dueHint}</span>
                    )}
                    {effortLabel && <span>Σ {effortLabel}</span>}
                    {href && (
                      <span className="inline-flex items-center gap-0.5 text-sky-600">
                        <ExternalLink className="h-2.5 w-2.5" /> Link
                      </span>
                    )}
                    {cmd && (
                      <span className="inline-flex items-center gap-0.5 text-violet-700">
                        <Terminal className="h-2.5 w-2.5" /> Befehl
                      </span>
                    )}
                    {visibleTags.map((tag) => (
                      <span key={tag} className={tagChipClass(tag)}>
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
              </div>
              {canWrite && (
                <button
                  type="button"
                  aria-label="Aktionen"
                  title="Aktionen"
                  className="my-1 shrink-0 rounded p-1 pr-2 opacity-70 hover:bg-zinc-100 group-hover:opacity-100 dark:hover:bg-zinc-800"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    openMenu(task.taskId, { top: r.bottom + 4, left: Math.max(8, r.right - 200) })
                  }}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </li>
            {canWrite && dragId && onReorderTask && canReorderAt(task.taskId) && (
              <TaskDropGap
                depth={depth}
                active={activeKey === afterKey}
                label="Hier einfügen (gleiche Ebene)"
                onActivate={() => setDropTarget({ kind: 'after', taskId: task.taskId })}
                onDrop={() => {
                  if (!dragId) return
                  onReorderTask(dragId, task.taskId, 'after')
                  clearDrag()
                }}
              />
            )}
          </Fragment>
        )
      })}
      {menuTaskId &&
        menuPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            data-et2-task-list-menu
            className={rowMenuClass}
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full justify-between gap-4 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                const row = tasks.find((t) => t.taskId === menuTaskId)
                setMenuTaskId(null)
                if (row) onOpenTaskDetail?.(row.relativePath)
              }}
            >
              <span>Detailansicht</span>
              <span className="text-zinc-400">Shift+Klick</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full justify-between gap-4 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                setMenuTaskId(null)
                if (canWrite) startInlineEdit(menuTaskId)
              }}
            >
              <span>Titel bearbeiten</span>
              <span className="text-zinc-400">Doppelklick</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full justify-between gap-4 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                setMenuTaskId(null)
                onAddSubtask(menuTaskId)
              }}
            >
              <span>Unteraufgabe anlegen</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full justify-between gap-4 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                setMenuTaskId(null)
                onMoveSibling?.(menuTaskId, 'up')
              }}
            >
              <span>Nach oben</span>
              <span className="text-zinc-400">Shift+↑</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full justify-between gap-4 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                setMenuTaskId(null)
                onMoveSibling?.(menuTaskId, 'down')
              }}
            >
              <span>Nach unten</span>
              <span className="text-zinc-400">Shift+↓</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full justify-between gap-4 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                setMenuTaskId(null)
                onIndentTask?.(menuTaskId)
              }}
            >
              <span>Einrücken</span>
              <span className="text-zinc-400">Shift+→</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full justify-between gap-4 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                setMenuTaskId(null)
                onOutdentTask?.(menuTaskId)
              }}
            >
              <span>Ausrücken</span>
              <span className="text-zinc-400">Shift+←</span>
            </button>
            <div className="my-0.5 border-t border-zinc-100 dark:border-zinc-800" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                setMenuTaskId(null)
                onReparentTask(menuTaskId)
              }}
            >
              Als Unteraufgabe von …
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => {
                if (window.confirm('Aufgabe inkl. Unteraufgaben löschen?')) {
                  onDeleteTask(menuTaskId)
                }
                setMenuTaskId(null)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Löschen
            </button>
          </div>,
          document.body,
        )}
    </ul>
    </div>
  )
}