import { useCallback, useEffect, useState } from 'react'
import type { Et2TaskSummary } from '../types/et2-task'
import type { FileSourceStore } from '../lib/file-sources'
import {
  scanSubtreeLegacyTasks,
  scanSubtreeTaskBundles,
  summaryFromBundleTask,
} from '../lib/et2/scan-folder-tasks'
import { parseTasksBundle, readTasksBundle } from '../lib/et2/tasks-bundle'
import { readTextFromStore } from '../lib/file-sources'
import { orderTasksAsTree } from '../lib/et2/task-tree-order'
import { parseTaskMd } from '../lib/et2/parse-task-md'
import { taskIdFromPath } from '../lib/et2/paths'
import { humanTaskTitle } from '../lib/et2/display-title'

export function useEt2TaskSummaries(
  indexedPaths: string[],
  dirPath: string,
  fileSources: FileSourceStore | null,
): {
  tasks: Et2TaskSummary[]
  loading: boolean
  reload: (opts?: { silent?: boolean }) => Promise<void>
  patchTask: (relativePath: string, patch: Partial<Et2TaskSummary>) => void
} {
  const [tasks, setTasks] = useState<Et2TaskSummary[]>([])
  const [loading, setLoading] = useState(false)

  const patchTask = useCallback((relativePath: string, patch: Partial<Et2TaskSummary>) => {
    setTasks((prev) =>
      prev.map((t) => (t.relativePath === relativePath ? { ...t, ...patch } : t)),
    )
  }, [])

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const legacyBase = scanSubtreeLegacyTasks(indexedPaths, dirPath)
    if (!fileSources) {
      setTasks(legacyBase)
      return
    }
    if (!opts?.silent) setLoading(true)
    try {
      const bundlePaths = scanSubtreeTaskBundles(indexedPaths, dirPath)
      const bundledSummaries: Et2TaskSummary[] = []

      await Promise.all(
        bundlePaths.map(async (bundlePath) => {
          try {
            const text = await readTextFromStore(fileSources, bundlePath)
            const bundle = parseTasksBundle(text)
            const scopeDir = bundlePath.replace(/\/\.et2\/tasks\.json$/, '')
            const ordered = orderTasksAsTree(bundle.tasks)
            for (const t of ordered) {
              bundledSummaries.push(
                summaryFromBundleTask(bundlePath, dirPath, {
                  id: t.id,
                  title: humanTaskTitle(t.title, t.body ?? '', t.id),
                  parentId: t.parentId,
                  status: t.status,
                  depth: t.depth,
                  kind: t.kind,
                  dueDate: t.dueDate,
                  tags: t.tags,
                }),
              )
            }
            void scopeDir
          } catch {
            /* ignore broken bundle */
          }
        }),
      )

      const legacyEnriched = await Promise.all(
        legacyBase.map(async (summary) => {
          try {
            const text = await readTextFromStore(fileSources, summary.relativePath)
            const id = taskIdFromPath(summary.relativePath) ?? summary.taskId
            const doc = parseTaskMd(text, id)
            return {
              ...summary,
              title: humanTaskTitle(doc.frontmatter.title, doc.body, id),
              kind: doc.frontmatter.kind,
              dueDate: doc.frontmatter.dueDate,
              tags: doc.frontmatter.tags,
              status: 'open' as const,
            }
          } catch {
            return summary
          }
        }),
      )

      const merged = [...bundledSummaries, ...legacyEnriched]
      merged.sort((a, b) => {
        const folder = (a.folderWithinScope ?? '').localeCompare(b.folderWithinScope ?? '', undefined, {
          sensitivity: 'base',
        })
        if (folder !== 0) return folder
        const da = a.depth ?? 0
        const db = b.depth ?? 0
        if (da !== db) return da - db
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      })
      setTasks(merged)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [indexedPaths, dirPath, fileSources])

  useEffect(() => {
    void load()
  }, [load])

  return { tasks, loading, reload: load, patchTask }
}

export async function readTasksBundleAt(
  store: FileSourceStore,
  bundlePath: string,
): Promise<ReturnType<typeof parseTasksBundle>> {
  const scope = bundlePath.replace(/\/\.et2\/tasks\.json$/, '')
  const bundle = await readTasksBundle(store, scope)
  if (!bundle) throw new Error('tasks.json fehlt')
  return bundle
}