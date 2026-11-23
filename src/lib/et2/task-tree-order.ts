import type { Et2TaskRecord } from '../../types/et2-tasks-bundle'

export interface Et2TaskWithDepth extends Et2TaskRecord {
  depth: number
}

/** Aufgaben in Baumreihenfolge (Parent, dann Kinder) für die Liste. */
export function orderTasksAsTree(tasks: Et2TaskRecord[]): Et2TaskWithDepth[] {
  const byParent = new Map<string | null, Et2TaskRecord[]>()
  for (const t of tasks) {
    const key = t.parentId ?? null
    const list = byParent.get(key) ?? []
    list.push(t)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => {
      const oa = a.order ?? 0
      const ob = b.order ?? 0
      if (oa !== ob) return oa - ob
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    })
  }

  const out: Et2TaskWithDepth[] = []
  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? []
    for (const c of children) {
      out.push({ ...c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}