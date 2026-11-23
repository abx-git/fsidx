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

/** Eine Ebene ausrücken. */
export function outdentTaskInTree(tasks: Et2TaskRecord[], taskId: string): Et2TaskRecord[] {
  const task = tasks.find((t) => t.id === taskId)
  if (!task?.parentId) return tasks
  const parent = tasks.find((t) => t.id === task.parentId)
  const newParentId = parent?.parentId ?? null
  if (wouldCreateTaskCycle(tasks, taskId, newParentId)) return tasks
  return reparentTaskInList(tasks, taskId, newParentId)
}
