import type { RawFileRow } from '../build-manifest'
import type { FileSourceStore } from '../file-sources'
import { writeTextToStore } from '../file-sources'
import { ET2_TASK_FORMAT } from '../../types/et2-task'
import type { Et2TaskKind } from '../../types/et2-task'
import { serializeTaskMd } from './serialize-task-md'
import { taskRelativePath } from './paths'

function newTaskId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  }
  return `t${Date.now().toString(36)}`
}

export interface CreateEt2TaskOptions {
  dirPath: string
  title: string
  kind?: Et2TaskKind
  body?: string
  taskId?: string
}

export async function createEt2TaskOnDisk(
  store: FileSourceStore,
  options: CreateEt2TaskOptions,
): Promise<{ relativePath: string; row: RawFileRow; taskId: string }> {
  const taskId = options.taskId ?? newTaskId()
  const relativePath = taskRelativePath(options.dirPath, taskId)
  const text = serializeTaskMd({
    frontmatter: {
      format: ET2_TASK_FORMAT,
      version: 1,
      id: taskId,
      kind: options.kind ?? 'card',
      title: options.title.trim() || 'Neue Aufgabe',
    },
    body: options.body ?? '',
  })
  await writeTextToStore(store, relativePath, text)
  const now = Date.now()
  const name = relativePath.split('/').pop() ?? relativePath
  const row: RawFileRow = {
    relativePath,
    name,
    kind: 'file',
    size: new Blob([text]).size,
    lastModified: now,
  }
  return { relativePath, row, taskId }
}