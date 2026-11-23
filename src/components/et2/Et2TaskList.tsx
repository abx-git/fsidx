import {
  ChevronRight,
  ExternalLink,
  ListPlus,
  MoreHorizontal,
  Terminal,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Et2TaskSummary } from '../../types/et2-task'
import { et2TaskStatusLabel } from '../../lib/et2/task-status-labels'
import { filterTasksForCollapsedTree } from '../../lib/et2/task-list-visibility'
import { formatDueHint, isDueOverdue, parseIsoDate } from '../../lib/et2/task-datetime'
import { formatEffortDisplay } from '../../lib/et2/task-effort'
import { getTaskCommand } from '../../lib/et2/task-command'
import { isTaskMarkedDone, tagChipClass, tagsWithoutCompletedTag } from '../../lib/et2/task-tags'
import { taskLinkHref } from '../../lib/et2/task-link'
import { taskHasChildren } from '../../lib/et2/task-bundle-ops'
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
  onDeleteTask: (taskId: string) => void
  onReparentTask: (taskId: string) => void
  canWrite: boolean
}

const rowMenuClass =
  'fixed z-[80] min-w-[11rem] rounded-md border border-zinc-200 bg-white py-0.5 text-[11px] shadow-lg dark:border-zinc-700 dark:bg-zinc-900'

export function Et2TaskList({
  tskPath,
  tasks,
  selectedTaskRef,
  onSelectTask,
  onAddSubtask,
  onDeleteTask,
  onReparentTask,
  canWrite,
}: Et2TaskListProps) {
  const [collapsedIds, setCollapsedIds] = useState(() => readCollapsed(tskPath))
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCollapsedIds(readCollapsed(tskPath))
  }, [tskPath])

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

  const openMenu = (taskId: string, rect: DOMRect) => {
    setMenuTaskId(taskId)
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 })
  }

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
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

        return (
          <li key={task.relativePath}>
            <div
              className={`group flex items-stretch gap-0.5 text-left text-xs hover:bg-violet-50 dark:hover:bg-violet-950/30 ${
                selected ? 'bg-violet-100/80 dark:bg-violet-950/40' : ''
              }`}
              style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
            >
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
              <button
                type="button"
                className="min-w-0 flex-1 py-2 pr-1 text-left"
                onClick={() => onSelectTask(task.relativePath)}
              >
                <span
                  className={`flex flex-wrap items-center gap-1.5 font-medium ${
                    done ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {task.title}
                  {task.status && (
                    <span className="rounded-full bg-white/80 px-1 py-0.5 text-[9px] font-normal text-violet-800 dark:bg-zinc-900">
                      {et2TaskStatusLabel(task.status)}
                    </span>
                  )}
                </span>
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
              </button>
              {canWrite && (
                <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-80 group-hover:opacity-100">
                  <button
                    type="button"
                    title="Unterkarte"
                    className="rounded p-1 text-violet-800 hover:bg-violet-100 dark:text-violet-200"
                    onClick={() => onAddSubtask(task.taskId)}
                  >
                    <ListPlus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Aktionen"
                    className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={(e) => openMenu(task.taskId, e.currentTarget.getBoundingClientRect())}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </li>
        )
      })}
      {menuTaskId &&
        menuPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={rowMenuClass}
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                const row = tasks.find((t) => t.taskId === menuTaskId)
                setMenuTaskId(null)
                if (row) onSelectTask(row.relativePath)
              }}
            >
              Details bearbeiten
            </button>
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
  )
}