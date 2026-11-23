import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore } from '../lib/file-sources'
import type { Et2TaskSummary } from '../types/et2-task'
import { parseTasksBundle } from '../lib/et2/tasks-bundle'
import { makeBundledTaskRef } from '../lib/et2/paths'
import { orderTasksAsTree } from '../lib/et2/task-tree-order'
import { humanTaskTitle } from '../lib/et2/display-title'

export function useTskFile(tskPath: string | null, fileSources: FileSourceStore | null) {
  const [tasks, setTasks] = useState<Et2TaskSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!tskPath || !fileSources) {
      setTasks([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const text = await readTextFromStore(fileSources, tskPath)
      const bundle = parseTasksBundle(text)
      const ordered = orderTasksAsTree(bundle.tasks)
      setTasks(
        ordered.map((t) => ({
          relativePath: makeBundledTaskRef(tskPath, t.id),
          taskId: t.id,
          title: humanTaskTitle(t.title, t.body ?? '', t.id),
          body: t.body,
          parentId: t.parentId,
          status: t.status,
          depth: t.depth,
          kind: t.kind,
          dueDate: t.dueDate,
          reminderDate: t.reminderDate,
          link: t.link,
          command: t.command,
          effort: t.effort,
          effortUnit: t.effortUnit,
          tags: t.tags,
          bundlePath: tskPath,
        })),
      )
    } catch (err) {
      setTasks([])
      setError(err instanceof Error ? err.message : 'Aufgaben-Datei konnte nicht gelesen werden')
    } finally {
      setLoading(false)
    }
  }, [tskPath, fileSources])

  useEffect(() => {
    void reload()
  }, [reload])

  return { tasks, loading, error, reload }
}