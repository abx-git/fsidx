import type { Et2BoardSnapshotV1, Et2TaskNodeJson } from '../../types/et2-legacy'
import { et2NodeToTaskDocument } from './node-to-task'
import { tasksBundleRelative } from './paths'
import { serializeTasksBundle } from './tasks-bundle'
import type { Et2TaskRecord } from '../../types/et2-tasks-bundle'

export interface MigratePlannedFile {
  relativePath: string
  content: string
  size: number
}

export interface MigrateDryRunResult {
  files: MigratePlannedFile[]
  folderCount: number
  taskCount: number
  relationFiles: number
}

export interface MigrateApplyCallbacks {
  writeFile: (relativePath: string, content: string) => Promise<void>
  onFileWritten?: (relativePath: string, size: number) => void
}

function collectTasksFlat(
  nodes: Et2TaskNodeJson[],
  parentId: string | null,
  migratedAt: string,
  acc: Et2TaskRecord[],
  orderStart: number,
): number {
  let order = orderStart
  for (const node of nodes) {
    const doc = et2NodeToTaskDocument(node, migratedAt)
    acc.push({
      id: node.id,
      parentId,
      title: doc.frontmatter.title,
      body: doc.body,
      status: 'open',
      kind: doc.frontmatter.kind,
      order,
      tags: doc.frontmatter.tags,
      dueDate: doc.frontmatter.dueDate,
    })
    order += 1
    if (node.children.length > 0) {
      order = collectTasksFlat(node.children, node.id, migratedAt, acc, order)
    }
  }
  return order
}

export function migrateEt2BoardDryRun(board: Et2BoardSnapshotV1): MigrateDryRunResult {
  const migratedAt = new Date().toISOString()
  const files: MigratePlannedFile[] = []
  const tasks: Et2TaskRecord[] = []
  collectTasksFlat(board.roots, null, migratedAt, tasks, 0)

  const bundleContent = serializeTasksBundle({
    format: 'et2-tasks-v1',
    version: 1,
    tasks,
  })
  const bundlePath = tasksBundleRelative('')
  files.push({
    relativePath: bundlePath,
    content: bundleContent,
    size: new Blob([bundleContent]).size,
  })

  return {
    files,
    folderCount: 0,
    taskCount: tasks.length,
    relationFiles: 0,
  }
}

export async function migrateEt2BoardApply(
  dryRun: MigrateDryRunResult,
  callbacks: MigrateApplyCallbacks,
): Promise<number> {
  let written = 0
  for (const f of dryRun.files) {
    await callbacks.writeFile(f.relativePath, f.content)
    callbacks.onFileWritten?.(f.relativePath, f.size)
    written++
  }
  return written
}