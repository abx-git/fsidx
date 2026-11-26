import type { FileIndexManifest } from '../types'

const DB_NAME = 'fsidx-workspace'
const DB_VERSION = 1
const STORE = 'meta'

export const SESSION_KEY = 'session'
export const DIRECTORY_HANDLE_KEY = 'directoryHandle'

export type WorkspaceSourceKind = 'handles' | 'files' | 'import'

export interface PersistedWorkspaceSession {
  manifest: FileIndexManifest
  sourceKind: WorkspaceSourceKind
  currentPath: string
  selectedId: string | null
  savedAt: string
  /** Bekannte Tresor-Ordner (`''` = ganzer Workspace-Root). */
  vaultRoots?: string[]
  /** Bekannte R-Base-Workspace-Stämme (`''` = ganzer Workspace-Root). */
  rbaseRoots?: string[]
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(key)
        req.onsuccess = () => resolve(req.result as T | undefined)
        req.onerror = () => reject(req.error)
      }),
  )
}

function idbSet(key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.objectStore(STORE).put(value, key)
      }),
  )
}

function idbDelete(key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.objectStore(STORE).delete(key)
      }),
  )
}

export async function loadWorkspaceSession(): Promise<PersistedWorkspaceSession | null> {
  try {
    const session = await idbGet<PersistedWorkspaceSession>(SESSION_KEY)
    if (!session?.manifest?.version) return null
    return session
  } catch {
    return null
  }
}

export async function saveWorkspaceSession(session: PersistedWorkspaceSession): Promise<void> {
  try {
    await idbSet(SESSION_KEY, session)
  } catch {
    /* quota or private mode */
  }
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    await idbSet(DIRECTORY_HANDLE_KEY, handle)
  } catch {
    /* ignore */
  }
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await idbGet<FileSystemDirectoryHandle>(DIRECTORY_HANDLE_KEY)
    return handle ?? null
  } catch {
    return null
  }
}

export async function clearWorkspaceStorage(): Promise<void> {
  try {
    await Promise.all([idbDelete(SESSION_KEY), idbDelete(DIRECTORY_HANDLE_KEY)])
  } catch {
    /* ignore */
  }
}