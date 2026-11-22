import type { RawFileRow } from './build-manifest'
import { resetIdCounter } from './id'

export function supportsDirectoryPicker(): boolean {
  return typeof window.showDirectoryPicker === 'function'
}

export async function pickDirectoryWithFsApi(): Promise<{
  rootName: string
  rows: RawFileRow[]
}> {
  resetIdCounter()
  const handle = await window.showDirectoryPicker({ mode: 'read' })
  const rows: RawFileRow[] = []
  await walkDirectoryHandle(handle, '', rows)
  return { rootName: handle.name, rows }
}

async function walkDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  prefix: string,
  rows: RawFileRow[],
): Promise<void> {
  for await (const [name, child] of dirHandle.entries()) {
    const relativePath = prefix ? `${prefix}/${name}` : name

    if (child.kind === 'directory') {
      rows.push({
        relativePath,
        name,
        kind: 'directory',
      })
      await walkDirectoryHandle(child, relativePath, rows)
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
): { rootName: string; rows: RawFileRow[] } {
  resetIdCounter()
  const dirSet = new Set<string>()
  const rows: RawFileRow[] = []

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

  return { rootName, rows }
}