import type { RawFileRow } from '../build-manifest'
import type { FileSourceStore } from '../file-sources'
import { ensureWritePermission, readTextFromStore, writeTextToStore } from '../file-sources'
import {
  ET2_TASKS_BUNDLE_FORMAT,
  type Et2TaskRecord,
  type Et2TasksBundle,
  type Et2TaskEditableFields,
  type Et2TaskStatus,
} from '../../types/et2-tasks-bundle'
import {
  deleteTaskSubtree,
  idsToRemoveForTaskSubtree,
  indentTaskInTree,
  moveTaskAmongSiblings,
  outdentTaskInTree,
  reparentTaskInList,
} from './task-bundle-ops'
import type { Et2TaskKind } from '../../types/et2-task'
import { DEFAULT_NEW_TASK_TITLE } from './constants'
import {
  isTaskBundleFilePath,
  makeBundledTaskRef,
  taskRefFromPath,
  tasksBundleRelative,
} from './paths'
import { parseTaskMd } from './parse-task-md'
import { isTaskFilePath, taskIdFromPath } from './paths'
import { defaultNewTskPath, isTskJsonPath, tskFileName } from './tsk-paths'
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
    throw new Error('Ungültige Aufgaben-JSON (et2-tasks-v1).')
  }
  return data
}

export function serializeTasksBundle(bundle: Et2TasksBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`
}

export function parentDirOfBundleFile(bundlePath: string): string {
  const norm = bundlePath.replace(/\\/g, '/').split('#')[0]
  const idx = norm.lastIndexOf('/')
  return idx === -1 ? '' : norm.slice(0, idx)
}

export async function readTasksBundleFile(
  store: FileSourceStore,
  bundleFilePath: string,
): Promise<Et2TasksBundle | null> {
  try {
    const text = await readTextFromStore(store, bundleFilePath)
    return parseTasksBundle(text)
  } catch {
    return null
  }
}

export async function writeTasksBundleFile(
  store: FileSourceStore,
  bundleFilePath: string,
  bundle: Et2TasksBundle,
): Promise<{ relativePath: string; row: RawFileRow }> {
  if (!(await ensureWritePermission(store))) {
    throw new Error('Schreibzugriff verweigert.')
  }
  const text = serializeTasksBundle(bundle)
  await writeTextToStore(store, bundleFilePath, text)
  const now = Date.now()
  const name = bundleFilePath.split('/').pop() ?? bundleFilePath
  const row: RawFileRow = {
    relativePath: bundleFilePath,
    name,
    kind: 'file',
    size: new Blob([text]).size,
    lastModified: now,
  }
  return { relativePath: bundleFilePath, row }
}

function pickNewTskPath(dirPath: string, indexedPaths: string[]): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = defaultNewTskPath(dirPath, attempt)
    if (!indexedPaths.includes(candidate)) return candidate
  }
  return defaultNewTskPath(dirPath, Date.now() % 1000)
}

export interface CreateEt2TaskOptions {
  /** Zielordner (wenn keine `tskPath`). */
  dirPath: string
  /** Bestehende `.tsk.json` oder Legacy-`.et2/tasks.json`. */
  tskPath?: string
  title: string
  kind?: Et2TaskKind
  body?: string
  taskId?: string
  parentId?: string | null
  status?: Et2TaskStatus
  /** Dateiname nur bei neuer Datei (z. B. `Projekt.tsk.json`). */
  tskFileName?: string
  indexedPaths?: string[]
}

export async function createNewTskFile(
  store: FileSourceStore,
  dirPath: string,
  options: {
    fileName?: string
    indexedPaths?: string[]
    initialTitle?: string
    initialBody?: string
  },
): Promise<{ tskPath: string; row: RawFileRow; taskId: string }> {
  const indexed = options.indexedPaths ?? []
  let fileName = options.fileName?.trim()
  if (!fileName) {
    const candidate = pickNewTskPath(dirPath, indexed)
    fileName = candidate.split('/').pop() ?? candidate
  }
  if (!fileName.toLowerCase().endsWith('.tsk.json')) {
    fileName = tskFileName(fileName.replace(/\.json$/i, ''))
  }
  const tskPath = dirPath ? `${dirPath}/${fileName}` : fileName
  const taskId = newTaskId()
  const bundle = emptyTasksBundle()
  bundle.tasks.push({
    id: taskId,
    parentId: null,
    title: options.initialTitle?.trim() || DEFAULT_NEW_TASK_TITLE,
    body: options.initialBody ?? '',
    status: 'open',
    kind: 'card',
    order: 0,
  })
  const { row } = await writeTasksBundleFile(store, tskPath, bundle)
  return { tskPath, row, taskId }
}

export async function createEt2TaskOnDisk(
  store: FileSourceStore,
  options: CreateEt2TaskOptions,
): Promise<{ relativePath: string; row: RawFileRow; taskId: string; bundlePath: string }> {
  const taskId = options.taskId ?? newTaskId()
  let bundlePath = options.tskPath?.replace(/\\/g, '/')

  if (!bundlePath) {
    const legacy = tasksBundleRelative(options.dirPath)
    const indexed = options.indexedPaths ?? []
    if (indexed.includes(legacy)) {
      bundlePath = legacy
    } else {
      const created = await createNewTskFile(store, options.dirPath, {
        fileName: options.tskFileName,
        indexedPaths: indexed,
        initialTitle: options.title,
        initialBody: options.body,
      })
      return {
        relativePath: makeBundledTaskRef(created.tskPath, created.taskId),
        row: created.row,
        taskId: created.taskId,
        bundlePath: created.tskPath,
      }
    }
  }

  const bundle =
    (await readTasksBundleFile(store, bundlePath)) ??
    (isTskJsonPath(bundlePath) ? emptyTasksBundle() : null)
  if (!bundle) throw new Error('Aufgaben-Datei konnte nicht gelesen werden.')

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
  const { row } = await writeTasksBundleFile(store, bundlePath, bundle)
  const relativePath = makeBundledTaskRef(bundlePath, taskId)
  return { relativePath, row, taskId, bundlePath }
}

export async function updateEt2TaskInBundle(
  store: FileSourceStore,
  bundleFilePath: string,
  taskId: string,
  patch: Partial<Et2TaskEditableFields>,
): Promise<{ row: RawFileRow }> {
  const bundle = await readTasksBundleFile(store, bundleFilePath)
  if (!bundle) throw new Error('Aufgaben-Datei fehlt.')
  const idx = bundle.tasks.findIndex((t) => t.id === taskId)
  if (idx === -1) throw new Error('Aufgabe nicht gefunden.')
  bundle.tasks[idx] = { ...bundle.tasks[idx], ...patch }
  const { row } = await writeTasksBundleFile(store, bundleFilePath, bundle)
  return { row }
}

export async function deleteEt2TaskFromBundle(
  store: FileSourceStore,
  bundleFilePath: string,
  taskId: string,
): Promise<{ row: RawFileRow; removedIds: string[] }> {
  const bundle = await readTasksBundleFile(store, bundleFilePath)
  if (!bundle) throw new Error('Aufgaben-Datei fehlt.')
  const removed = idsToRemoveForTaskSubtree(bundle.tasks, taskId)
  if (!removed.has(taskId)) throw new Error('Aufgabe nicht gefunden.')
  bundle.tasks = deleteTaskSubtree(bundle.tasks, taskId)
  const { row } = await writeTasksBundleFile(store, bundleFilePath, bundle)
  return { row, removedIds: [...removed] }
}

export async function reparentEt2Task(
  store: FileSourceStore,
  bundleFilePath: string,
  taskId: string,
  newParentId: string | null,
): Promise<{ row: RawFileRow }> {
  const bundle = await readTasksBundleFile(store, bundleFilePath)
  if (!bundle) throw new Error('Aufgaben-Datei fehlt.')
  bundle.tasks = reparentTaskInList(bundle.tasks, taskId, newParentId)
  const { row } = await writeTasksBundleFile(store, bundleFilePath, bundle)
  return { row }
}

export async function setEt2TaskOrder(
  store: FileSourceStore,
  bundleFilePath: string,
  taskId: string,
  order: number,
): Promise<{ row: RawFileRow }> {
  return updateEt2TaskInBundle(store, bundleFilePath, taskId, { order })
}

async function mutateTasksBundleFile(
  store: FileSourceStore,
  bundleFilePath: string,
  mutate: (tasks: Et2TaskRecord[]) => Et2TaskRecord[],
): Promise<{ row: RawFileRow }> {
  const bundle = await readTasksBundleFile(store, bundleFilePath)
  if (!bundle) throw new Error('Aufgaben-Datei fehlt.')
  bundle.tasks = mutate(bundle.tasks)
  const { row } = await writeTasksBundleFile(store, bundleFilePath, bundle)
  return { row }
}

export async function moveEt2TaskSibling(
  store: FileSourceStore,
  bundleFilePath: string,
  taskId: string,
  direction: 'up' | 'down',
): Promise<{ row: RawFileRow }> {
  return mutateTasksBundleFile(store, bundleFilePath, (tasks) =>
    moveTaskAmongSiblings(tasks, taskId, direction),
  )
}

export async function nestEt2TaskUnder(
  store: FileSourceStore,
  bundleFilePath: string,
  taskId: string,
  newParentId: string | null,
): Promise<{ row: RawFileRow }> {
  return mutateTasksBundleFile(store, bundleFilePath, (tasks) =>
    reparentTaskInList(tasks, taskId, newParentId),
  )
}

export async function indentEt2Task(
  store: FileSourceStore,
  bundleFilePath: string,
  taskId: string,
): Promise<{ row: RawFileRow }> {
  return mutateTasksBundleFile(store, bundleFilePath, (tasks) => indentTaskInTree(tasks, taskId))
}

export async function outdentEt2Task(
  store: FileSourceStore,
  bundleFilePath: string,
  taskId: string,
): Promise<{ row: RawFileRow }> {
  return mutateTasksBundleFile(store, bundleFilePath, (tasks) => outdentTaskInTree(tasks, taskId))
}

export async function loadEt2TaskRecord(
  store: FileSourceStore,
  bundlePath: string,
  taskId: string,
): Promise<Et2TaskRecord> {
  const bundle = await readTasksBundleFile(store, bundlePath)
  if (!bundle) throw new Error('Aufgaben-Datei fehlt.')
  const task = bundle.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error('Aufgabe nicht gefunden.')
  return task
}

/** @deprecated Legacy — liest `.et2/tasks.json` im Ordner */
export async function readTasksBundle(store: FileSourceStore, scopeDir: string) {
  return readTasksBundleFile(store, tasksBundleRelative(scopeDir))
}

export async function loadEt2TaskRecordBySelection(
  store: FileSourceStore,
  selectionPath: string,
): Promise<{ bundlePath: string; taskId: string; record: Et2TaskRecord }> {
  const ref = taskRefFromPath(selectionPath)
  if (!ref) throw new Error('Keine Aufgabenreferenz.')
  const record = await loadEt2TaskRecord(store, ref.bundlePath, ref.taskId)
  return { bundlePath: ref.bundlePath, taskId: ref.taskId, record }
}

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

export function isTaskStoragePath(path: string): boolean {
  return isTaskBundleFilePath(path) || isTskJsonPath(path)
}