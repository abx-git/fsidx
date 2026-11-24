import type { Et2TaskRecord } from '../../types/et2-tasks-bundle'

/** Alle Nachfahren-IDs (rekursiv) für `parentId`-Wald. */
export function collectDescendantTaskIds(tasks: Et2TaskRecord[], rootId: string): Set<string> {
  const out = new Set<string>()
  const byParent = new Map<string | null, Et2TaskRecord[]>()
  for (const t of tasks) {
    const key = t.parentId ?? null
    const list = byParent.get(key) ?? []
    list.push(t)
    byParent.set(key, list)
  }
  const stack = [...(byParent.get(rootId) ?? [])]
  while (stack.length) {
    const n = stack.pop()!
    if (out.has(n.id)) continue
    out.add(n.id)
    for (const c of byParent.get(n.id) ?? []) stack.push(c)
  }
  return out
}

export function idsToRemoveForTaskSubtree(tasks: Et2TaskRecord[], taskId: string): Set<string> {
  const remove = collectDescendantTaskIds(tasks, taskId)
  remove.add(taskId)
  return remove
}

export function deleteTaskSubtree(tasks: Et2TaskRecord[], taskId: string): Et2TaskRecord[] {
  const remove = idsToRemoveForTaskSubtree(tasks, taskId)
  return tasks.filter((t) => !remove.has(t.id))
}

/** `newParentId === null` = Wurzel. Zyklus → Fehler. */
export function wouldCreateTaskCycle(
  tasks: Et2TaskRecord[],
  taskId: string,
  newParentId: string | null,
): boolean {
  if (newParentId === null) return false
  if (newParentId === taskId) return true
  const descendants = collectDescendantTaskIds(tasks, taskId)
  if (descendants.has(newParentId)) return true
  return false
}

export function reparentTaskInList(
  tasks: Et2TaskRecord[],
  taskId: string,
  newParentId: string | null,
): Et2TaskRecord[] {
  if (wouldCreateTaskCycle(tasks, taskId, newParentId)) {
    throw new Error('Ungültige Verschachtelung (Zyklus).')
  }
  const siblings = tasks.filter((t) => (t.parentId ?? null) === newParentId && t.id !== taskId)
  const maxOrder = siblings.reduce((m, t) => Math.max(m, t.order ?? 0), -1)
  return tasks.map((t) =>
    t.id === taskId ? { ...t, parentId: newParentId, order: maxOrder + 1 } : t,
  )
}

export function taskHasChildren(taskId: string, tasks: Et2TaskRecord[]): boolean {
  return tasks.some((t) => (t.parentId ?? null) === taskId)
}

function siblingsOf(tasks: Et2TaskRecord[], parentId: string | null): Et2TaskRecord[] {
  return tasks
    .filter((t) => (t.parentId ?? null) === parentId)
    .sort((a, b) => {
      const oa = a.order ?? 0
      const ob = b.order ?? 0
      if (oa !== ob) return oa - ob
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    })
}

/** Geschwisterreihenfolge tauschen (↑/↓). */
export function moveTaskAmongSiblings(
  tasks: Et2TaskRecord[],
  taskId: string,
  direction: 'up' | 'down',
): Et2TaskRecord[] {
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return tasks
  const parentId = task.parentId ?? null
  const sibs = siblingsOf(tasks, parentId)
  const idx = sibs.findIndex((s) => s.id === taskId)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (idx < 0 || swapIdx < 0 || swapIdx >= sibs.length) return tasks
  const a = sibs[idx]
  const b = sibs[swapIdx]
  const orderA = a.order ?? idx
  const orderB = b.order ?? swapIdx
  return tasks.map((t) => {
    if (t.id === a.id) return { ...t, order: orderB }
    if (t.id === b.id) return { ...t, order: orderA }
    return t
  })
}

/** Eine Ebene einrücken (Unteraufgabe des vorherigen Geschwisters). */
export function indentTaskInTree(tasks: Et2TaskRecord[], taskId: string): Et2TaskRecord[] {
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return tasks
  const sibs = siblingsOf(tasks, task.parentId ?? null)
  const idx = sibs.findIndex((s) => s.id === taskId)
  if (idx <= 0) return tasks
  const newParentId = sibs[idx - 1].id
  if (wouldCreateTaskCycle(tasks, taskId, newParentId)) return tasks
  return reparentTaskInList(tasks, taskId, newParentId)
}

/**
 * Aufgabe auf die Ebene von `anchor` setzen und davor/danach einsortieren.
 */
export function reorderTaskRelativeToSibling(
  tasks: Et2TaskRecord[],
  taskId: string,
  anchorTaskId: string,
  place: 'before' | 'after',
): Et2TaskRecord[] {
  if (taskId === anchorTaskId) return tasks
  const anchor = tasks.find((t) => t.id === anchorTaskId)
  const task = tasks.find((t) => t.id === taskId)
  if (!anchor || !task) return tasks

  const parentId = anchor.parentId ?? null
  if (wouldCreateTaskCycle(tasks, taskId, parentId)) {
    throw new Error('Ungültige Verschachtelung (Zyklus).')
  }

  const others = tasks.filter((t) => t.id !== taskId)
  const moved: Et2TaskRecord = { ...task, parentId }
  const sibs = siblingsOf(others, parentId)
  const anchorPos = sibs.findIndex((s) => s.id === anchorTaskId)
  if (anchorPos < 0) return tasks
  const at = place === 'before' ? anchorPos : anchorPos + 1
  const nextSibs = [...sibs.slice(0, at), moved, ...sibs.slice(at)]
  const orderById = new Map(nextSibs.map((t, i) => [t.id, i]))

  return tasks.map((t) => {
    if (t.id === taskId) {
      return { ...t, parentId, order: orderById.get(taskId)! }
    }
    if ((t.parentId ?? null) === parentId && orderById.has(t.id)) {
      return { ...t, order: orderById.get(t.id)! }
    }
    return t
  })
}

/** Neue Aufgabe direkt unter dem Anker (gleiche Ebene, sortiert danach). */
export function insertTaskSiblingAfter(
  tasks: Et2TaskRecord[],
  anchorTaskId: string,
  newTask: Et2TaskRecord,
): Et2TaskRecord[] {
  const anchor = tasks.find((t) => t.id === anchorTaskId)
  if (!anchor) return [...tasks, newTask]
  const parentId = anchor.parentId ?? null
  const sibs = siblingsOf(tasks, parentId)
  const idx = sibs.findIndex((s) => s.id === anchorTaskId)
  const anchorOrder = anchor.order ?? idx
  const insertOrder = anchorOrder + 1
  const bumped = tasks.map((t) => {
    if ((t.parentId ?? null) !== parentId) return t
    const o = t.order ?? 0
    if (o >= insertOrder) return { ...t, order: o + 1 }
    return t
  })
  return [...bumped, { ...newTask, parentId, order: insertOrder }]
}

/** Eine Ebene ausrücken — direkt nach dem bisherigen Elter auf gleicher Ebene. */
export function outdentTaskInTree(tasks: Et2TaskRecord[], taskId: string): Et2TaskRecord[] {
  const task = tasks.find((t) => t.id === taskId)
  if (!task?.parentId) return tasks
  const parent = tasks.find((t) => t.id === task.parentId)
  if (!parent) return tasks
  const newParentId = parent.parentId ?? null
  if (wouldCreateTaskCycle(tasks, taskId, newParentId)) return tasks

  const grandSibs = siblingsOf(tasks, newParentId)
  const parentIdx = grandSibs.findIndex((s) => s.id === parent.id)
  const parentOrder = parent.order ?? parentIdx
  const insertOrder = parentOrder + 1

  return tasks.map((t) => {
    if (t.id === taskId) {
      return { ...t, parentId: newParentId, order: insertOrder }
    }
    if ((t.parentId ?? null) === newParentId && (t.order ?? 0) >= insertOrder) {
      return { ...t, order: (t.order ?? 0) + 1 }
    }
    return t
  })
}
