import type { Et2BoardSnapshotV1, Et2TaskNodeJson, Et2TaskRelation } from '../../types/et2-legacy'
import { et2NodeToTaskDocument } from './node-to-task'
import { serializeTaskMd } from './serialize-task-md'
import { folderMetaRelative, relationsRelative, taskRelativePath } from './paths'
import { sanitizePathSegment } from './sanitize-segment'

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

function relationsForChildren(children: Et2TaskNodeJson[], all: Et2TaskRelation[]): Et2TaskRelation[] {
  const ids = new Set(children.map((c) => c.id))
  return all.filter((r) => ids.has(r.sourceId) && ids.has(r.targetId))
}

function walkNode(
  node: Et2TaskNodeJson,
  parentPath: string,
  migratedAt: string,
  allRelations: Et2TaskRelation[],
  acc: MigratePlannedFile[],
): string {
  const folderName = sanitizePathSegment(node.title, node.id)
  const dirPath = parentPath ? `${parentPath}/${folderName}` : folderName

  const taskDoc = et2NodeToTaskDocument(node, migratedAt)
  const taskContent = serializeTaskMd(taskDoc)
  const taskPath = taskRelativePath(dirPath, node.id)
  acc.push({
    relativePath: taskPath,
    content: taskContent,
    size: new Blob([taskContent]).size,
  })

  if (node.children.length > 0) {
    const folderMeta = {
      format: 'et2-folder-v1',
      version: 1,
      title: node.title,
      et2: { legacyId: node.id, legacyPath: dirPath },
    }
    const folderMetaContent = `${JSON.stringify(folderMeta, null, 2)}\n`
    acc.push({
      relativePath: folderMetaRelative(dirPath),
      content: folderMetaContent,
      size: new Blob([folderMetaContent]).size,
    })

    const rels = relationsForChildren(node.children, allRelations)
    if (rels.length > 0) {
      const relContent = `${JSON.stringify(rels, null, 2)}\n`
      acc.push({
        relativePath: relationsRelative(dirPath),
        content: relContent,
        size: new Blob([relContent]).size,
      })
    }

    for (const child of node.children) {
      walkNode(child, dirPath, migratedAt, allRelations, acc)
    }
  }

  return dirPath
}

export function migrateEt2BoardDryRun(board: Et2BoardSnapshotV1): MigrateDryRunResult {
  const migratedAt = new Date().toISOString()
  const files: MigratePlannedFile[] = []
  const relations = board.relations ?? []

  for (const root of board.roots) {
    walkNode(root, '', migratedAt, relations, files)
  }

  const taskCount = files.filter((f) => f.relativePath.includes('/.et2/tasks/')).length
  const relationFiles = files.filter((f) => f.relativePath.endsWith('relations.json')).length
  const folderPaths = new Set<string>()
  for (const f of files) {
    const parts = f.relativePath.split('/')
    for (let i = 1; i < parts.length; i++) {
      folderPaths.add(parts.slice(0, i).join('/'))
    }
  }

  return {
    files,
    folderCount: folderPaths.size,
    taskCount,
    relationFiles,
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