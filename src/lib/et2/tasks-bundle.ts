import type { RawFileRow } from '../build-manifest'
import type { FileSourceStore } from '../file-sources'
import { ensureWritePermission, readTextFromStore, writeTextToStore } from '../file-sources'
import {
  ET2_TASKS_BUNDLE_FORMAT,
  type Et2TaskRecord,
  type Et2TasksBundle,
  type Et2TaskStatus,
} from '../../types/et2-tasks-bundle'
import type { Et2TaskKind } from '../../types/et2-task'
import { DEFAULT_NEW_TASK_TITLE } from './constants'
import { et2DirRelative, makeBundledTaskRef, tasksBundleRelative } from './paths'
import { ensureDirectoryOnDisk } from '../create-workspace'
import { parseTaskMd } from './parse-task-md'
import { isTaskFilePath, taskIdFromPath } from './paths'
import { taskContainerDir } from '../workspace-scope'

function newTaskId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  }
  return `t${Date.now().toString(36)}`
}

export function emptyTasksBundle(): Et2TasksBundle {
  return { format: ET2_TASKS_BUNDLE_FORMAT, version: 1, tasks: [] }
}

export function parseTasksBundle(json: string): Et2TasksBundle {
  const data = JSON.parse(json) as Et2TasksBundle
  if (data?.format !== ET2_TASKS_BUNDLE_FORMAT || data.version !== 1 || !Array.isArray(data.tasks)) {
    throw new Error('Ungültige tasks.json (et2-tasks-v1).')
  }
  return data
}

export function serializeTasksBundle(bundle: Et2TasksBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`
}

export function scopeDirFromBundlePath(bundlePath: string): string {
  return taskContainerDirForBundle(bundlePath)
}

export function taskContainerDirForBundle(bundleOrTaskPath: string): string {
  const norm = bundleOrTaskPath.replace(/\\/g, '/').split('#')[0]
  const marker = `/${et2DirRelative()}/tasks.json`
  const idx = norm.indexOf(marker)
  if (idx === -1) return ''
  return norm.slice(0, idx)
}

export async function readTasksBundle(
  store: FileSourceStore,
  scopeDir: string,
): Promise<Et2TasksBundle | null> {
  const path = tasksBundleRelative(scopeDir)
  try {
    const text = await readTextFromStore(store, path)
    return parseTasksBundle(text)
  } catch {
    return null
  }
}

export async function writeTasksBundle(
  store: FileSourceStore,
  scopeDir: string,
  bundle: Et2TasksBundle,
): Promise<{ relativePath: string; row: RawFileRow }> {
  if (!(await ensureWritePermission(store))) {
    throw new Error('Schreibzugriff verweigert.')
  }
  const et2Path = scopeDir ? `${scopeDir}/${et2DirRelative()}` : et2DirRelative()
  await ensureDirectoryOnDisk(store, et2Path)
  const relativePath = tasksBundleRelative(scopeDir)
  const text = serializeTasksBundle(bundle)
  await writeTextToStore(store, relativePath, text)
  const now = Date.now()
  const row: RawFileRow = {
    relativePath,
    name: 'tasks.json',
    kind: 'file',
    size: new Blob([text]).size,
    lastModified: now,
  }
  return { relativePath, row }
}

export interface CreateEt2TaskOptions {
  dirPath: string
  title: string
  kind?: Et2TaskKind
  body?: string
  taskId?: string
  parentId?: string | null
  status?: Et2TaskStatus
}

export async function createEt2TaskOnDisk(
  store: FileSourceStore,
  options: CreateEt2TaskOptions,
): Promise<{ relativePath: string; row: RawFileRow; taskId: string; bundlePath: string }> {
  const taskId = options.taskId ?? newTaskId()
  const bundle = (await readTasksBundle(store, options.dirPath)) ?? emptyTasksBundle()
  const record: Et2TaskRecord = {
    id: taskId,
    parentId: options.parentId ?? null,
    title: options.title.trim() || DEFAULT_NEW_TASK_TITLE,
    body: options.body ?? '',
    status: options.status ?? 'open',
    kind: options.kind ?? 'card',
    order: bundle.tasks.length,
  }
  bundle.tasks.push(record)
  const { relativePath: bundlePath, row } = await writeTasksBundle(store, options.dirPath, bundle)
  const relativePath = makeBundledTaskRef(bundlePath, taskId)
  return { relativePath, row, taskId, bundlePath }
}

export async function updateEt2TaskInBundle(
  store: FileSourceStore,
  scopeDir: string,
  taskId: string,
  patch: Partial<Pick<Et2TaskRecord, 'title' | 'body' | 'status' | 'parentId' | 'kind'>>,
): Promise<{ row: RawFileRow }> {
  const bundle = await readTasksBundle(store, scopeDir)
  if (!bundle) throw new Error('tasks.json fehlt.')
  const idx = bundle.tasks.findIndex((t) => t.id === taskId)
  if (idx === -1) throw new Error('Aufgabe nicht gefunden.')
  bundle.tasks[idx] = { ...bundle.tasks[idx], ...patch }
  const { row } = await writeTasksBundle(store, scopeDir, bundle)
  return { row }
}

export async function loadEt2TaskRecord(
  store: FileSourceStore,
  bundlePath: string,
  taskId: string,
): Promise<Et2TaskRecord> {
  const scopeDir = taskContainerDirForBundle(bundlePath)
  const bundle = await readTasksBundle(store, scopeDir)
  if (!bundle) throw new Error('tasks.json fehlt.')
  const task = bundle.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error('Aufgabe nicht gefunden.')
  return task
}

/** Legacy `.task.md` in einem Scope in einen Bundle-Datensatz überführen (nur Lesen). */
export async function legacyMdTasksForScope(
  store: FileSourceStore,
  scopeDir: string,
  indexedPaths: string[],
): Promise<Et2TaskRecord[]> {
  const normScope = scopeDir.replace(/\\/g, '/').replace(/\/$/, '')
  const records: Et2TaskRecord[] = []
  for (const rel of indexedPaths) {
    const norm = rel.replace(/\\/g, '/')
    if (!isTaskFilePath(norm)) continue
    if (taskContainerDir(norm) !== normScope) continue
    try {
      const text = await readTextFromStore(store, rel)
      const id = taskIdFromPath(norm) ?? rel
      const doc = parseTaskMd(text, id)
      records.push({
        id: doc.frontmatter.id,
        parentId: null,
        title: doc.frontmatter.title,
        body: doc.body,
        status: 'open',
        kind: doc.frontmatter.kind,
        tags: doc.frontmatter.tags,
        dueDate: doc.frontmatter.dueDate,
      })
    } catch {
      /* skip */
    }
  }
  return records
}