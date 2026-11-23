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
