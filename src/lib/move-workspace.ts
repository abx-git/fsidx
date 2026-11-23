import type { RawFileRow } from './build-manifest'
import { deletePathFromStore } from './delete-workspace'
import {
  ensureWritePermission,
  readBlobFromStore,
  readTextFromStore,
  writeBlobToStore,
  writeTextToStore,
  type FileSourceStore,
} from './file-sources'
import { parseFileMetadata, serializeFileMetadata, sidecarPathForFile } from './sidecar'

const FSIDX_FILE_DRAG = 'application/x-fsidx-file'

export interface FsidxFileDragPayload {
  path: string
  id: string
  name: string
}

export function fsidxFileDragMime(): string {
  return FSIDX_FILE_DRAG
}

export function parseFsidxFileDrag(data: string): FsidxFileDragPayload | null {
  try {
    const parsed = JSON.parse(data) as FsidxFileDragPayload
    if (!parsed?.path || !parsed.id || !parsed.name) return null
    return parsed
  } catch {
    return null
  }
}

export function parentDirOfFile(filePath: string): string {
  const norm = filePath.replace(/\\/g, '/')
  const idx = norm.lastIndexOf('/')
  return idx === -1 ? '' : norm.slice(0, idx)
}

export function resolveMoveFilePath(filePath: string, destDirPath: string): string {
  const norm = filePath.replace(/\\/g, '/')
  const dir = destDirPath.replace(/\\/g, '/')
  const name = norm.split('/').pop() ?? norm
  return dir ? `${dir}/${name}` : name
}

export function resolveRenameFilePath(filePath: string, newFileName: string): string {
  const parent = parentDirOfFile(filePath.replace(/\\/g, '/'))
  const name = newFileName.trim().replace(/\\/g, '/')
  const base = name.includes('/') ? (name.split('/').pop() ?? name) : name
  if (!base) throw new Error('Dateiname fehlt.')
  return parent ? `${parent}/${base}` : base
}

export function renameFileValidationError(
  filePath: string,
  newFileName: string,
  occupiedPaths: Set<string>,
): string | null {
  const from = filePath.replace(/\\/g, '/')
  let newPath: string
  try {
    newPath = resolveRenameFilePath(from, newFileName)
  } catch (err) {
    return err instanceof Error ? err.message : 'Ungültiger Dateiname.'
  }
  if (newPath === from) return 'Der Name ist unverändert.'
  if (occupiedPaths.has(newPath)) {
    return 'In diesem Ordner existiert bereits eine Datei mit diesem Namen.'
  }
  return null
}

export function moveFileValidationError(
  filePath: string,
  destDirPath: string,
  occupiedPaths: Set<string>,
): string | null {
  const from = filePath.replace(/\\/g, '/')
  const destDir = destDirPath.replace(/\\/g, '/')
  if (!from || from.endsWith('/')) return 'Ungültiger Dateipfad.'
  const newPath = resolveMoveFilePath(from, destDir)
  if (newPath === from) return null
  if (occupiedPaths.has(newPath)) {
    return 'Im Zielordner existiert bereits eine Datei mit diesem Namen.'
  }
  return null
}

async function sidecarExists(store: FileSourceStore, sidecarPath: string): Promise<boolean> {
  try {
    await readTextFromStore(store, sidecarPath)
    return true
  } catch {
    return false
  }
}

async function relocateFileInStore(
  store: FileSourceStore,
  from: string,
  newPath: string,
): Promise<{ newPath: string; row: RawFileRow; sidecarRow: RawFileRow | null }> {
  const blob = await readBlobFromStore(store, from)
  const fileName = from.split('/').pop() ?? 'file'
  const file = blob instanceof File ? blob : new File([await blob.arrayBuffer()], fileName)
  await writeBlobToStore(store, newPath, file)
  await deletePathFromStore(store, from, 'file')

  const row: RawFileRow = {
    relativePath: newPath,
    name: newPath.split('/').pop() ?? newPath,
    kind: 'file',
    size: file.size,
    lastModified: file.lastModified ?? Date.now(),
  }

  const oldSidecar = sidecarPathForFile(from)
  const newSidecar = sidecarPathForFile(newPath)
  let sidecarRow: RawFileRow | null = null
  if (await sidecarExists(store, oldSidecar)) {
    const text = await readTextFromStore(store, oldSidecar)
    const meta = parseFileMetadata(JSON.parse(text))
    meta.target.path = newPath
    meta.target.name = row.name
    const updated = serializeFileMetadata(meta)
    await writeTextToStore(store, newSidecar, updated)
    await deletePathFromStore(store, oldSidecar, 'file')
    sidecarRow = {
      relativePath: newSidecar,
      name: newSidecar.split('/').pop() ?? newSidecar,
      kind: 'file',
      size: new Blob([updated]).size,
      lastModified: Date.now(),
    }
  }

  return { newPath, row, sidecarRow }
}

export async function moveFileInStore(
  store: FileSourceStore,
  filePath: string,
  destDirPath: string,
  occupiedPaths: Set<string>,
): Promise<{ newPath: string; row: RawFileRow; sidecarRow: RawFileRow | null }> {
  if (store.kind !== 'handles') {
    throw new Error('Verschieben nur mit Chrome/Edge und Schreibzugriff auf den Ordner.')
  }
  if (!(await ensureWritePermission(store))) {
    throw new Error('Schreibzugriff verweigert.')
  }

  const from = filePath.replace(/\\/g, '/')
  const destDir = destDirPath.replace(/\\/g, '/')
  const newPath = resolveMoveFilePath(from, destDir)
  const err = moveFileValidationError(from, destDir, occupiedPaths)
  if (err) throw new Error(err)
  if (newPath === from) {
    throw new Error('Die Datei liegt bereits in diesem Ordner.')
  }

  return relocateFileInStore(store, from, newPath)
}

export async function renameFileInStore(
  store: FileSourceStore,
  filePath: string,
  newFileName: string,
  occupiedPaths: Set<string>,
): Promise<{ newPath: string; row: RawFileRow; sidecarRow: RawFileRow | null }> {
  if (store.kind !== 'handles') {
    throw new Error('Umbenennen nur mit Chrome/Edge und Schreibzugriff auf den Ordner.')
  }
  if (!(await ensureWritePermission(store))) {
    throw new Error('Schreibzugriff verweigert.')
  }

  const from = filePath.replace(/\\/g, '/')
  const err = renameFileValidationError(from, newFileName, occupiedPaths)
  if (err) throw new Error(err)
  const newPath = resolveRenameFilePath(from, newFileName)
  return relocateFileInStore(store, from, newPath)
}