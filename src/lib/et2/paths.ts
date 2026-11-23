export const ET2_DIR = '.et2'
export const ET2_TASKS_SUBDIR = 'tasks'
export const ET2_FOLDER_JSON = 'folder.json'
export const ET2_RELATIONS_JSON = 'relations.json'
export const ET2_TASK_EXT = '.task.md'

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

export function isTaskFilePath(relativePath: string): boolean {
  return relativePath.includes(`/${ET2_TASKS_SUBDIR}/`) && relativePath.endsWith(ET2_TASK_EXT)
}

export function taskIdFromPath(relativePath: string): string | null {
  if (!isTaskFilePath(relativePath)) return null
  const name = relativePath.split('/').pop() ?? ''
  if (!name.endsWith(ET2_TASK_EXT)) return null
  return name.slice(0, -ET2_TASK_EXT.length)
}