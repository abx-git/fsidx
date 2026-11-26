import { RBASE_PROJECT_FILENAME } from './r-base-paths'

/** Relativer Pfad zum R-Base-Workspace-Stamm (Ordner, der r-base.project.json enthält). */
export type RBaseRoots = Set<string>

export function isRBaseProjectMarkerPath(path: string): boolean {
  const norm = path.replace(/\\/g, '/')
  return norm === RBASE_PROJECT_FILENAME || norm.endsWith(`/${RBASE_PROJECT_FILENAME}`)
}

export function rBaseRootFromProjectPath(path: string): string {
  const norm = path.replace(/\\/g, '/')
  const slash = norm.lastIndexOf('/')
  return slash < 0 ? '' : norm.slice(0, slash)
}

export function inferRBaseRootsFromMarkerEntries(entryPaths: readonly string[]): string[] {
  const roots = new Set<string>()
  for (const raw of entryPaths) {
    const path = raw.replace(/\\/g, '/')
    if (!isRBaseProjectMarkerPath(path)) continue
    roots.add(rBaseRootFromProjectPath(path))
  }
  return [...roots]
}

export function mergeRBaseRootLists(
  persisted: string[] | undefined,
  inferred: string[],
  explicit?: string[],
): string[] {
  const set = new Set<string>()
  for (const r of persisted ?? []) set.add(r.replace(/\\/g, '/'))
  for (const r of inferred) set.add(r)
  for (const r of explicit ?? []) set.add(r.replace(/\\/g, '/'))
  return [...set]
}

export function rBaseRootForPath(path: string, rbaseRoots: RBaseRoots): string | null {
  const norm = path.replace(/\\/g, '/')
  if (rbaseRoots.has('')) {
    if (norm === '' || !norm.includes('/')) return ''
  }
  let best: string | null = null
  for (const root of rbaseRoots) {
    if (root === '') continue
    if (norm === root || norm.startsWith(`${root}/`)) {
      if (!best || root.length > best.length) best = root
    }
  }
  return best
}

export function isPathInRBaseWorkspace(path: string, rbaseRoots: RBaseRoots): boolean {
  return rBaseRootForPath(path, rbaseRoots) !== null
}

export function scopeRBaseRoot(scopePath: string, rbaseRoots: readonly string[]): string | null {
  if (rbaseRoots.includes('')) return ''
  const norm = scopePath.replace(/\\/g, '/')
  let best: string | null = null
  for (const root of rbaseRoots) {
    if (norm === root || norm.startsWith(`${root}/`)) {
      if (!best || root.length > best.length) best = root
    }
  }
  return best
}

/** Technische Ordner unter R-Base-Stamm (wie in r-base SKIP_SCAN). */
export const RBASE_TECHNICAL_DIR_NAMES = new Set(['_imports', '_exports', 'deleted'])

export function isRBaseTechnicalEntryPath(path: string, rbaseRoots: RBaseRoots): boolean {
  const root = rBaseRootForPath(path, rbaseRoots)
  if (root === null) return false
  const norm = path.replace(/\\/g, '/')
  const rel = root === '' ? norm : norm.slice(root.length + 1)
  if (!rel) return false
  const top = rel.split('/')[0]
  return RBASE_TECHNICAL_DIR_NAMES.has(top)
}