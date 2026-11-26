export const RBASE_PROJECT_FILENAME = 'r-base.project.json'
export const RBASE_DATASET_META_FILENAME = 'meta.json'

export function isRBaseProjectConfigPath(path: string): boolean {
  const norm = path.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? ''
  return norm === RBASE_PROJECT_FILENAME
}

export function isRBaseDatasetMetaPath(path: string): boolean {
  const norm = path.replace(/\\/g, '/')
  return norm === RBASE_DATASET_META_FILENAME || norm.endsWith(`/${RBASE_DATASET_META_FILENAME}`)
}

export function isRBaseIndexedPath(path: string): boolean {
  return isRBaseProjectConfigPath(path) || isRBaseDatasetMetaPath(path)
}

/** Verzeichnis der meta.json (relativer Workspace-Pfad). */
export function datasetFolderFromMetaPath(metaPath: string): string {
  const norm = metaPath.replace(/\\/g, '/')
  const slash = norm.lastIndexOf('/')
  return slash < 0 ? '' : norm.slice(0, slash)
}

export function workspaceRootFromProjectPath(projectPath: string): string {
  return datasetFolderFromMetaPath(projectPath)
}

export function rBaseWorkspaceRootFromPath(
  filePath: string,
  indexedPaths: Iterable<string>,
): string | null {
  const set = new Set(
    [...indexedPaths].map((p) => p.replace(/\\/g, '/')),
  )
  const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean)
  for (let i = parts.length; i >= 0; i--) {
    const dir = parts.slice(0, i).join('/')
    const candidate = dir ? `${dir}/${RBASE_PROJECT_FILENAME}` : RBASE_PROJECT_FILENAME
    if (set.has(candidate)) return dir
  }
  return null
}