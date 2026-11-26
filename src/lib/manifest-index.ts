import type { IndexEntry } from '../types'
import { groupEntriesByParent } from './manifest-children'

export type ManifestIndexes = {
  byParent: Map<string, IndexEntry[]>
  byPath: Map<string, IndexEntry>
  byId: Map<string, IndexEntry>
  filePaths: Set<string>
}

/** Einmalige Ableitungen aus `entries` — für Listen, Suche und Sidecars. */
export function buildManifestIndexes(entries: IndexEntry[]): ManifestIndexes {
  const byParent = groupEntriesByParent(entries)
  const byPath = new Map<string, IndexEntry>()
  const byId = new Map<string, IndexEntry>()
  const filePaths = new Set<string>()
  for (const e of entries) {
    byPath.set(e.path, e)
    byId.set(e.id, e)
    if (e.kind === 'file') filePaths.add(e.path)
  }
  return { byParent, byPath, byId, filePaths }
}

/** Alle Einträge unter einem Scope (inkl. Unterordner), ohne den ganzen Workspace zu scannen. */
export function collectEntriesInScope(
  byParent: Map<string, IndexEntry[]>,
  scopePath: string,
): IndexEntry[] {
  const out: IndexEntry[] = []
  const stack = [...(byParent.get(scopePath) ?? [])]
  while (stack.length > 0) {
    const e = stack.pop()!
    out.push(e)
    if (e.kind === 'directory') {
      const kids = byParent.get(e.path)
      if (kids) stack.push(...kids)
    }
  }
  return out
}