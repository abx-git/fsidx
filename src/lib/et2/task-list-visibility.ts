import type { Et2TaskSummary } from '../../types/et2-task'

function summaryHasChildren(taskId: string, tasks: Et2TaskSummary[]): boolean {
  return tasks.some((t) => (t.parentId ?? null) === taskId)
}

/** Sichtbare Zeilen mit Collapse — Nachfahren eingeklappter Knoten ausblenden. */
export function filterTasksForCollapsedTree(
  ordered: Et2TaskSummary[],
  collapsedIds: ReadonlySet<string>,
): Et2TaskSummary[] {
  const out: Et2TaskSummary[] = []
  let hideDepth: number | null = null

  for (const row of ordered) {
    const depth = row.depth ?? 0
    if (hideDepth !== null) {
      if (depth <= hideDepth) {
        hideDepth = null
      } else {
        continue
      }
    }
    out.push(row)
    if (collapsedIds.has(row.taskId) && summaryHasChildren(row.taskId, ordered)) {
      hideDepth = depth
    }
  }
  return out
}