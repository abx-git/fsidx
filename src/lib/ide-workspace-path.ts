const STORAGE_KEY = 'fsidx.ideWorkspaceAbsPathByRoot'

type Store = Record<string, string>

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Store
  } catch {
    return {}
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}

/** Vom Nutzer hinterlegter absoluter Pfad zum Workspace-Stamm (für Cursor/VS-Code-Befehle). */
export function readIdeWorkspaceAbsPath(workspaceRootName: string): string {
  if (!workspaceRootName) return ''
  const v = readStore()[workspaceRootName]
  return typeof v === 'string' ? v.trim() : ''
}

export function writeIdeWorkspaceAbsPath(workspaceRootName: string, absPath: string): void {
  if (!workspaceRootName) return
  const store = readStore()
  const trimmed = absPath.trim()
  if (!trimmed) {
    delete store[workspaceRootName]
  } else {
    store[workspaceRootName] = trimmed
  }
  writeStore(store)
}