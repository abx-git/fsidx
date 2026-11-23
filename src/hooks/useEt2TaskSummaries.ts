import { useCallback, useEffect, useState } from 'react'
import type { Et2TaskSummary } from '../types/et2-task'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore } from '../lib/file-sources'
import { scanSubtreeTasks } from '../lib/et2/scan-folder-tasks'
import { parseTaskMd } from '../lib/et2/parse-task-md'
import { taskIdFromPath } from '../lib/et2/paths'

export function useEt2TaskSummaries(
  indexedPaths: string[],
  dirPath: string,
  fileSources: FileSourceStore | null,
): {
  tasks: Et2TaskSummary[]
  loading: boolean
  reload: () => void
} {
  const [tasks, setTasks] = useState<Et2TaskSummary[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const base = scanSubtreeTasks(indexedPaths, dirPath)
    if (!fileSources) {
      setTasks(base)
      return
    }
    setLoading(true)
    try {
      const enriched = await Promise.all(
        base.map(async (summary) => {
          try {
            const text = await readTextFromStore(fileSources, summary.relativePath)
            const id = taskIdFromPath(summary.relativePath) ?? summary.taskId
            const doc = parseTaskMd(text, id)
            return {
              ...summary,
              title: doc.frontmatter.title,
              kind: doc.frontmatter.kind,
              dueDate: doc.frontmatter.dueDate,
              tags: doc.frontmatter.tags,
            }
          } catch {
            return summary
          }
        }),
      )
      setTasks(enriched)
    } finally {
      setLoading(false)
    }
  }, [indexedPaths, dirPath, fileSources])

  useEffect(() => {
    void load()
  }, [load])

  return { tasks, loading, reload: load }
}