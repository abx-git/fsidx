/** Scope = aktueller Ordner: alle Funktionen nur auf diesen Teilbaum. */

export function normalizeScopePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/$/, '')
}

/** Liegt `entryPath` im Ordner `scopePath` (inkl. Unterordner)? Leerer Scope = gesamter Workspace. */
export function isEntryInScope(entryPath: string, scopePath: string): boolean {
  const scope = normalizeScopePath(scopePath)
  const p = normalizeScopePath(entryPath)
  if (scope === '') return true
  return p === scope || p.startsWith(`${scope}/`)
}

export interface ScopeCrumb {
  label: string
  path: string
}

/** Kette vom Workspace-Root bis zum aktuellen Scope (Navigation in den Zweig). */
export function scopeAncestorCrumbs(scopePath: string, workspaceRootName: string): ScopeCrumb[] {
  if (!scopePath) return [{ label: workspaceRootName, path: '' }]
  const crumbs: ScopeCrumb[] = [{ label: workspaceRootName, path: '' }]
  let built = ''
  for (const part of scopePath.split('/').filter(Boolean)) {
    built = built ? `${built}/${part}` : part
    crumbs.push({ label: part, path: built })
  }
  return crumbs
}

export function taskContainerDir(taskFilePath: string): string {
  const norm = taskFilePath.replace(/\\/g, '/').split('#')[0]
  if (norm.toLowerCase().endsWith('.tsk.json')) {
    const idx = norm.lastIndexOf('/')
    return idx === -1 ? '' : norm.slice(0, idx)
  }
  const bundleMarker = '/.et2/tasks.json'
  const bundleIdx = norm.indexOf(bundleMarker)
  if (bundleIdx >= 0) return norm.slice(0, bundleIdx)
  const marker = '/.et2/tasks/'
  const idx = norm.indexOf(marker)
  if (idx === -1) return ''
  return norm.slice(0, idx)
}

/** Ordner, in dem die Task-Datei liegt, relativ zum Scope (`.` = Scope-Ordner selbst). */
export function relativeFolderWithinScope(taskFilePath: string, scopePath: string): string {
  const basePath = taskFilePath.split('#')[0]
  const container = taskContainerDir(basePath)
  const scope = normalizeScopePath(scopePath)
  if (!scope) return container || '.'
  if (container === scope) return '.'
  if (container.startsWith(`${scope}/`)) {
    return container.slice(scope.length + 1)
  }
  return container
}