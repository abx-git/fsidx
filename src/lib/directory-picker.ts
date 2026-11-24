import type { RawFileRow } from './build-manifest'
import type { FileSourceStore } from './file-sources'
import { resetIdCounter } from './id'
import { directoryHasVaultMarker } from './vault/vault-index'
import { VAULT_MARKER_FILENAME } from './vault/marker'

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

export async function fileSourcesFromDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<FileSourceStore & { vaultRoots: string[] }> {
  const rows: RawFileRow[] = []
  const handles = new Map<string, FileSystemFileHandle>()
  const vaultRoots: string[] = []
  await walkDirectoryHandle(handle, '', rows, handles, vaultRoots)
  return {
    kind: 'handles',
    rootName: handle.name,
    root: handle,
    handles,
    vaultRoots,
  }
}

export async function pickDirectoryWithFsApi(): Promise<{
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
  await walkDirectoryHandle(handle, '', rows, handles, vaultRoots)
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

async function walkDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  prefix: string,
  rows: RawFileRow[],
  handles: Map<string, FileSystemFileHandle>,
  vaultRoots: string[],
): Promise<void> {
  for await (const [name, child] of dirHandle.entries()) {
    const relativePath = prefix ? `${prefix}/${name}` : name

    if (child.kind === 'directory') {
      rows.push({
        relativePath,
        name,
        kind: 'directory',
      })
      const isVault = await directoryHasVaultMarker(child)
      if (isVault) {
        vaultRoots.push(relativePath)
        try {
          const marker = await child.getFileHandle(VAULT_MARKER_FILENAME)
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
          /* marker missing despite detection race */
        }
        continue
      }
      await walkDirectoryHandle(child, relativePath, rows, handles, vaultRoots)
    } else {
      let size: number | undefined
      let lastModified: number | undefined
      try {
        const file = await child.getFile()
        size = file.size
        lastModified = file.lastModified
      } catch {
        /* permission or transient read failure */
      }
      handles.set(relativePath, child)
      rows.push({
        relativePath,
        name,
        kind: 'file',
        size,
        lastModified,
      })
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