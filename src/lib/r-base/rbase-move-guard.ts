import type { FileSourceStore } from '../file-sources'
import { isPathInRBaseWorkspace, type RBaseRoots } from './rbase-roots'

const RBASE_WRITE_BLOCK_MSG =
  'In R-Base-Workspaces Dateien nur über die eingebettete R-Base-Oberfläche ändern (Verschieben/Rename in fsidx deaktiviert).'

export function rbaseRootsFromStore(store: FileSourceStore | null | undefined): RBaseRoots {
  const list = store && 'rbaseRoots' in store ? store.rbaseRoots : undefined
  return new Set((list ?? []).map((r) => r.replace(/\\/g, '/')))
}

export function assertFsidxWritableOutsideRBase(
  store: FileSourceStore | null | undefined,
  ...paths: string[]
): void {
  const roots = rbaseRootsFromStore(store)
  if (!roots.size) return
  for (const path of paths) {
    if (isPathInRBaseWorkspace(path.replace(/\\/g, '/'), roots)) {
      throw new Error(RBASE_WRITE_BLOCK_MSG)
    }
  }
}