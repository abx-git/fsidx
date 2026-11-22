import type { RawFileRow } from './build-manifest'
import type { FileSourceStore } from './file-sources'
import { resetIdCounter } from './id'

export function supportsDirectoryPicker(): boolean {
  return typeof window.showDirectoryPicker === 'function'
}

export async function pickDirectoryWithFsApi(): Promise<{
  rootName: string
  rows: RawFileRow[]
  fileSources: FileSourceStore
}> {
  resetIdCounter()
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  const rows: RawFileRow[] = []
  const handles = new Map<string, FileSystemFileHandle>()
  await walkDirectoryHandle(handle, '', rows, handles)
  return {
    rootName: handle.name,
    rows,
    fileSources: { kind: 'handles', rootName: handle.name, root: handle, handles },
  }
}

async function walkDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  prefix: string,
  rows: RawFileRow[],
  handles: Map<string, FileSystemFileHandle>,
): Promise<void> {
  for await (const [name, child] of dirHandle.entries()) {
    const relativePath = prefix ? `${prefix}/${name}` : name

    if (child.kind === 'directory') {
      rows.push({
        relativePath,
        name,
        kind: 'directory',
      })
      await walkDirectoryHandle(child, relativePath, rows, handles)
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