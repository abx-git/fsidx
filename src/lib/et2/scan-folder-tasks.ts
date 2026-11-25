import type { Et2TaskSummary } from '../../types/et2-task'
import { isEntryInScope, relativeFolderWithinScope, normalizeScopePath } from '../workspace-scope'
import {
  isLegacyEt2TasksBundlePath,
  isTaskFilePath,
  isTasksBundlePath,
  makeBundledTaskRef,
  taskIdFromPath,
} from './paths'
import { isTskJsonPath } from './tsk-paths'
import { DEFAULT_NEW_TASK_TITLE } from './constants'

function scopeDirsInSubtree(indexedRelativePaths: string[], scopePath: string): string[] {
  const scope = normalizeScopePath(scopePath)
  const dirs = new Set<string>()
  for (const rel of indexedRelativePaths) {
    const norm = rel.replace(/\\/g, '/')
    if (!isEntryInScope(norm, scopePath)) continue
    if (isTasksBundlePath(norm)) {
      dirs.add(taskContainerDirFromBundle(norm))
      continue
    }
    if (isTaskFilePath(norm)) {
      dirs.add(taskContainerDirFromLegacy(norm))
    }
  }
  if (scope === '') dirs.add('')
  else if (indexedRelativePaths.some((p) => isEntryInScope(p, scopePath))) {
    dirs.add(scope)
  }
  return [...dirs]
}

function taskContainerDirFromBundle(bundlePath: string): string {
  const norm = bundlePath.replace(/\\/g, '/')
  const marker = '/.et2/tasks.json'
  const idx = norm.indexOf(marker)
  if (idx === -1) return ''
  return norm.slice(0, idx)
}

function taskContainerDirFromLegacy(taskPath: string): string {
  const norm = taskPath.replace(/\\/g, '/')
  const marker = '/.et2/tasks/'
  const idx = norm.indexOf(marker)
  if (idx === -1) return ''
  return norm.slice(0, idx)
}

/** Bundle-Dateien im Teilbaum (für async Auflösung). */
export function scanSubtreeTaskBundles(
  indexedRelativePaths: string[],
  scopePath: string,
): string[] {
  const bundles: string[] = []
  for (const rel of indexedRelativePaths) {
    const norm = rel.replace(/\\/g, '/')
    if (!isTasksBundlePath(norm)) continue
    if (!isEntryInScope(norm, scopePath)) continue
    bundles.push(norm)
  }
  return bundles.sort()
}

/** Platzhalter-Summaries für Bundle-Pfade (Titel folgen aus JSON). */
export function scanBundledTaskPlaceholders(
  indexedRelativePaths: string[],
  scopePath: string,
): Et2TaskSummary[] {
  const bundles = scanSubtreeTaskBundles(indexedRelativePaths, scopePath)
  const summaries: Et2TaskSummary[] = []
  for (const bundlePath of bundles) {
    summaries.push({
      relativePath: bundlePath,
      taskId: '',
      title: '…',
      bundlePath,
      folderWithinScope: relativeFolderWithinScope(bundlePath, scopePath),
    })
  }
  return summaries
}

/** Legacy `.task.md` im Teilbaum. */
export function scanSubtreeLegacyTasks(
  indexedRelativePaths: string[],
  scopePath: string,
  titleByPath?: Map<string, string>,
): Et2TaskSummary[] {
  const summaries: Et2TaskSummary[] = []
  for (const rel of indexedRelativePaths) {
    const norm = rel.replace(/\\/g, '/')
    if (!isTaskFilePath(norm)) continue
    if (!isEntryInScope(norm, scopePath)) continue
    const taskId = taskIdFromPath(norm)
    if (!taskId) continue
    summaries.push({
      relativePath: norm,
      taskId,
      title: titleByPath?.get(norm) ?? DEFAULT_NEW_TASK_TITLE,
      folderWithinScope: relativeFolderWithinScope(norm, scopePath),
    })
  }
  summaries.sort((a, b) => {
    const folder = (a.folderWithinScope ?? '').localeCompare(b.folderWithinScope ?? '', undefined, {
      sensitivity: 'base',
    })
    if (folder !== 0) return folder
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  })
  return summaries
}

/** Scope-Ordner, in denen Aufgaben liegen können (Bundle oder Legacy). */
export function listTaskScopeDirs(indexedRelativePaths: string[], scopePath: string): string[] {
  return scopeDirsInSubtree(indexedRelativePaths, scopePath)
}

/** Alle Tasks im Teilbaum — Legacy sofort; Bundles über Hook. */
export function scanSubtreeTasks(
  indexedRelativePaths: string[],
  scopePath: string,
  titleByPath?: Map<string, string>,
): Et2TaskSummary[] {
  return scanSubtreeLegacyTasks(indexedRelativePaths, scopePath, titleByPath)
}

export function summaryFromBundleTask(
  bundlePath: string,
  scopePath: string,
  task: {
    id: string
    title: string
    parentId?: string | null
    status?: Et2TaskSummary['status']
    depth?: number
    kind?: Et2TaskSummary['kind']
    dueDate?: string | null
    tags?: string[]
  },
): Et2TaskSummary {
  return {
    relativePath: makeBundledTaskRef(bundlePath, task.id),
    taskId: task.id,
    title: task.title,
    parentId: task.parentId,
    status: task.status,
    depth: task.depth,
    kind: task.kind,
    dueDate: task.dueDate,
    tags: task.tags,
    bundlePath,
    folderWithinScope: relativeFolderWithinScope(bundlePath, scopePath),
  }
}

export function countEt2TasksInSubtree(indexedRelativePaths: string[], scopePath: string): number {
  const legacy = scanSubtreeLegacyTasks(indexedRelativePaths, scopePath).length
  const bundles = scanSubtreeTaskBundles(indexedRelativePaths, scopePath).length
  let tsk = 0
  for (const rel of indexedRelativePaths) {
    const norm = rel.replace(/\\/g, '/')
    if (!isTskJsonPath(norm)) continue
    if (!isEntryInScope(norm, scopePath)) continue
    tsk += 1
  }
  return legacy + bundles + tsk
}

function bumpEt2CountsForDir(counts: Map<string, number>, containerDir: string): void {
  let dir = containerDir
  for (;;) {
    counts.set(dir, (counts.get(dir) ?? 0) + 1)
    if (!dir) break
    dir = dir.includes('/') ? dir.replace(/\/[^/]+$/, '') : ''
  }
}

/** Einmaliger Index für Aufgaben-Badges im Baum (statt O(Knoten × N) pro Render). */
export function buildEt2TaskCountIndex(indexedRelativePaths: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const rel of indexedRelativePaths) {
    const norm = rel.replace(/\\/g, '/')
    if (isTaskFilePath(norm)) {
      bumpEt2CountsForDir(counts, taskContainerDirFromLegacy(norm))
    }
    if (isTasksBundlePath(norm)) {
      if (isLegacyEt2TasksBundlePath(norm)) {
        bumpEt2CountsForDir(counts, taskContainerDirFromBundle(norm))
      } else if (isTskJsonPath(norm)) {
        const parent = norm.includes('/') ? norm.replace(/\/[^/]+$/, '') : ''
        bumpEt2CountsForDir(counts, parent)
      }
    }
    if (isTskJsonPath(norm)) {
      const parent = norm.includes('/') ? norm.replace(/\/[^/]+$/, '') : ''
      bumpEt2CountsForDir(counts, parent)
    }
  }
  return counts
}