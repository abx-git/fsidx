import type { RawFileRow } from './build-manifest'
import type { FileSourceStore } from './file-sources'
import { resetIdCounter } from './id'
import { isVaultDirectory } from './vault/vault-detect'
import { VAULT_MARKER_FILENAME } from './vault/marker'
import { inferVaultRootsFromMarkerEntries } from './vault/vault-paths'
import { setVaultOpaqueOnDiskCount } from './vault/vault-session'

export const DIRECTORY_PICKER_ID = 'fsidx-root'

export function supportsDirectoryPicker(): boolean {
  return typeof window.showDirectoryPicker === 'function'
}

export async function requestDirectoryPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const current = await handle.queryPermission({ mode: 'readwrite' })
  if (current === 'granted') return true
  if (current === 'denied') return false
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

function augmentVaultRootsFromRows(rows: RawFileRow[], vaultRoots: string[]): void {
  for (const root of inferVaultRootsFromMarkerEntries(rows.map((r) => r.relativePath))) {
    if (!vaultRoots.includes(root)) vaultRoots.push(root)
  }
}

async function absorbVaultFolder(
  relativePath: string,
  dirHandle: FileSystemDirectoryHandle,
  rows: RawFileRow[],
  handles: Map<string, FileSystemFileHandle>,
  vaultRoots: string[],
): Promise<void> {
  if (!vaultRoots.includes(relativePath)) vaultRoots.push(relativePath)

  let opaqueCount = 0
  for await (const [name] of dirHandle.entries()) {
    if (name !== VAULT_MARKER_FILENAME) opaqueCount++
  }
  setVaultOpaqueOnDiskCount(relativePath, opaqueCount)

  if (relativePath) {
    rows.push({
      relativePath,
      name: relativePath.split('/').pop() ?? relativePath,
      kind: 'directory',
    })
  }

  try {
    const marker = await dirHandle.getFileHandle(VAULT_MARKER_FILENAME)
    const markerPath = relativePath ? `${relativePath}/${VAULT_MARKER_FILENAME}` : VAULT_MARKER_FILENAME
    handles.set(markerPath, marker)
    const file = await marker.getFile()
    rows.push({
      relativePath: markerPath,
      name: VAULT_MARKER_FILENAME,
      kind: 'file',
      size: file.size,
      lastModified: file.lastModified,
    })
  } catch {
    /* x-be Vault ohne fsidx-Marker */
  }
}

/** Nur Root-Handle; Datei-Handles werden bei Bedarf aufgelöst (schnelle Sitzungswiederherstellung). */
export function fileSourcesFromRootHandle(
  handle: FileSystemDirectoryHandle,
  vaultRoots: string[] = [],
): FileSourceStore & { vaultRoots: string[] } {
  return {
    kind: 'handles',
    rootName: handle.name,
    root: handle,
    handles: new Map(),
    vaultRoots,
  }
}

export type DirectoryWalkProgress = (scanned: number) => void

export async function fileSourcesFromDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  onProgress?: DirectoryWalkProgress,
): Promise<FileSourceStore & { vaultRoots: string[] }> {
  const rows: RawFileRow[] = []
  const handles = new Map<string, FileSystemFileHandle>()
  const vaultRoots: string[] = []
  await walkDirectoryHandle(handle, '', rows, handles, vaultRoots, onProgress)
  augmentVaultRootsFromRows(rows, vaultRoots)
  return {
    kind: 'handles',
    rootName: handle.name,
    root: handle,
    handles,
    vaultRoots,
  }
}

export async function pickDirectoryWithFsApi(
  onProgress?: DirectoryWalkProgress,
): Promise<{
  rootName: string
  rows: RawFileRow[]
  fileSources: FileSourceStore
  rootHandle: FileSystemDirectoryHandle
}> {
  resetIdCounter()
  const handle = await window.showDirectoryPicker({
    mode: 'readwrite',
    id: DIRECTORY_PICKER_ID,
  })
  const rows: RawFileRow[] = []
  const handles = new Map<string, FileSystemFileHandle>()
  const vaultRoots: string[] = []
  await walkDirectoryHandle(handle, '', rows, handles, vaultRoots, onProgress)
  augmentVaultRootsFromRows(rows, vaultRoots)
  return {
    rootName: handle.name,
    rows,
    fileSources: {
      kind: 'handles',
      rootName: handle.name,
      root: handle,
      handles,
      vaultRoots,
    },
    rootHandle: handle,
  }
}

const WALK_YIELD_EVERY = 400

async function walkDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  prefix: string,
  rows: RawFileRow[],
  handles: Map<string, FileSystemFileHandle>,
  vaultRoots: string[],
  onProgress?: DirectoryWalkProgress,
): Promise<void> {
  if (prefix === '' && (await isVaultDirectory(dirHandle))) {
    await absorbVaultFolder('', dirHandle, rows, handles, vaultRoots)
    return
  }

  let sinceYield = 0
  const tickProgress = () => {
    if (!onProgress) return
    onProgress(rows.length)
    sinceYield = 0
  }

  for await (const [name, child] of dirHandle.entries()) {
    const relativePath = prefix ? `${prefix}/${name}` : name

    if (child.kind === 'directory') {
      if (await isVaultDirectory(child)) {
        await absorbVaultFolder(relativePath, child, rows, handles, vaultRoots)
        sinceYield++
        if (sinceYield >= WALK_YIELD_EVERY) {
          tickProgress()
          await new Promise((r) => setTimeout(r, 0))
        }
        continue
      }
      rows.push({
        relativePath,
        name,
        kind: 'directory',
      })
      sinceYield++
      if (sinceYield >= WALK_YIELD_EVERY) {
        tickProgress()
        await new Promise((r) => setTimeout(r, 0))
      }
      await walkDirectoryHandle(child, relativePath, rows, handles, vaultRoots, onProgress)
    } else {
      handles.set(relativePath, child)
      rows.push({
        relativePath,
        name,
        kind: 'file',
      })
      sinceYield++
      if (sinceYield >= WALK_YIELD_EVERY) {
        tickProgress()
        await new Promise((r) => setTimeout(r, 0))
      }
    }
  }
}

/** Fallback for browsers without File System Access API */
export function rowsFromFileList(
  fileList: FileList,
  rootName: string,
): { rootName: string; rows: RawFileRow[]; fileSources: FileSourceStore } {
  resetIdCounter()
  const dirSet = new Set<string>()
  const rows: RawFileRow[] = []
  const files = new Map<string, File>()

  for (const file of Array.from(fileList)) {
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
    if (!rel) continue

    const parts = rel.split('/')
    parts.pop()
    let built = ''
    for (const segment of parts) {
      built = built ? `${built}/${segment}` : segment
      dirSet.add(built)
    }

    files.set(rel, file)
    rows.push({
      relativePath: rel,
      name: file.name,
      kind: 'file',
      size: file.size,
      lastModified: file.lastModified,
    })
  }

  for (const dirPath of dirSet) {
    const name = dirPath.split('/').pop() ?? dirPath
    rows.push({
      relativePath: dirPath,
      name,
      kind: 'directory',
    })
  }

  return {
    rootName,
    rows,
    fileSources: { kind: 'files', rootName, files },
  }
}