export const ET2_DIR = '.et2'
export const ET2_TASKS_SUBDIR = 'tasks'
export const ET2_FOLDER_JSON = 'folder.json'
export const ET2_RELATIONS_JSON = 'relations.json'
export const ET2_TASKS_JSON = 'tasks.json'
export const ET2_TASK_EXT = '.task.md'
export const ET2_TASK_REF_SEP = '#'

export function et2DirRelative(): string {
  return ET2_DIR
}

export function et2TasksDirRelative(): string {
  return `${ET2_DIR}/${ET2_TASKS_SUBDIR}`
}

export function taskFileName(taskId: string): string {
  return `${taskId}${ET2_TASK_EXT}`
}

export function taskRelativePath(dirPrefix: string, taskId: string): string {
  const base = dirPrefix ? `${dirPrefix}/` : ''
  return `${base}${et2TasksDirRelative()}/${taskFileName(taskId)}`
}

export function folderMetaRelative(dirPrefix: string): string {
  const base = dirPrefix ? `${dirPrefix}/` : ''
  return `${base}${ET2_DIR}/${ET2_FOLDER_JSON}`
}

export function relationsRelative(dirPrefix: string): string {
  const base = dirPrefix ? `${dirPrefix}/` : ''
  return `${base}${ET2_DIR}/${ET2_RELATIONS_JSON}`
}

export function tasksBundleRelative(dirPrefix: string): string {
  const base = dirPrefix ? `${dirPrefix}/` : ''
  return `${base}${ET2_DIR}/${ET2_TASKS_JSON}`
}

export function isTasksBundlePath(relativePath: string): boolean {
  const norm = relativePath.replace(/\\/g, '/').split(ET2_TASK_REF_SEP)[0]
  return norm.endsWith(`/${ET2_DIR}/${ET2_TASKS_JSON}`) || norm === `${ET2_DIR}/${ET2_TASKS_JSON}`
}

export function isBundledTaskRef(relativePath: string): boolean {
  return relativePath.includes(ET2_TASK_REF_SEP) && isTasksBundlePath(relativePath.split(ET2_TASK_REF_SEP)[0])
}

export function taskRefFromPath(relativePath: string): { bundlePath: string; taskId: string } | null {
  const i = relativePath.indexOf(ET2_TASK_REF_SEP)
  if (i === -1) return null
  const bundlePath = relativePath.slice(0, i)
  const taskId = relativePath.slice(i + 1)
  if (!isTasksBundlePath(bundlePath) || !taskId) return null
  return { bundlePath, taskId }
}

export function makeBundledTaskRef(bundlePath: string, taskId: string): string {
  return `${bundlePath}${ET2_TASK_REF_SEP}${taskId}`
}

export function isEt2TaskSelectionPath(relativePath: string): boolean {
  return isTaskFilePath(relativePath) || isBundledTaskRef(relativePath)
}

export function taskIdFromSelectionPath(relativePath: string): string | null {
  const ref = taskRefFromPath(relativePath)
  if (ref) return ref.taskId
  return taskIdFromPath(relativePath)
}

export function isTaskFilePath(relativePath: string): boolean {
  return relativePath.includes(`/${ET2_TASKS_SUBDIR}/`) && relativePath.endsWith(ET2_TASK_EXT)
}

export function taskIdFromPath(relativePath: string): string | null {
  if (!isTaskFilePath(relativePath)) return null
  const name = relativePath.split('/').pop() ?? ''
  if (!name.endsWith(ET2_TASK_EXT)) return null
  return name.slice(0, -ET2_TASK_EXT.length)
}