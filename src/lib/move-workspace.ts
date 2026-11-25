import type { RawFileRow } from './build-manifest'
import type { FileIndexManifest } from '../types'
import { deletePathFromStore } from './delete-workspace'
import { ensureDirectoryOnDisk, directoryRow } from './create-workspace'
import {
  ensureWritePermission,
  readBlobFromStore,
  readTextFromStore,
  writeBlobToStore,
  writeTextToStore,
  type FileSourceStore,
} from './file-sources'
import { parseFileMetadata, serializeFileMetadata, sidecarPathForFile } from './sidecar'
import { assertVaultUnlockedForWrite, ensureVaultDirectoryOnDisk } from './vault/vault-io'
import { isPathUnderVaultRoot, vaultRootForPath } from './vault/vault-paths'
import { isVaultUnlocked } from './vault/vault-session'

const FSIDX_FILE_DRAG = 'application/x-fsidx-file'

export interface FsidxFileDragPayload {
  path: string
  id: string
  name: string
  kind?: 'file' | 'directory'
  /** Weitere markierte Einträge (Mehrfachauswahl in der Dateiliste). */
  batch?: FsidxFileDragPayload[]
}

export function fsidxFileDragMime(): string {
  return FSIDX_FILE_DRAG
}

export function parseFsidxFileDrag(data: string): FsidxFileDragPayload | null {
  try {
    const parsed = JSON.parse(data) as FsidxFileDragPayload
    if (!parsed?.path || !parsed.id || !parsed.name) return null
    return { ...parsed, kind: parsed.kind ?? 'file' }
  } catch {
    return null
  }
}

function normalizeDragPayload(item: FsidxFileDragPayload): FsidxFileDragPayload {
  return { ...item, kind: item.kind ?? 'file' }
}

/** Alle Einträge eines Drag-Vorgangs (einzeln oder Mehrfachauswahl). */
export function expandFsidxFileDrag(data: string): FsidxFileDragPayload[] {
  const primary = parseFsidxFileDrag(data)
  if (!primary) return []
  const rest = primary.batch?.filter((b) => b?.path && b.id && b.name).map(normalizeDragPayload) ?? []
  const all = [normalizeDragPayload(primary), ...rest.filter((b) => b.path !== primary.path)]
  const seen = new Set<string>()
  return all.filter((p) => {
    if (seen.has(p.path)) return false
    seen.add(p.path)
    return true
  })
}

export function parentDirOfFile(filePath: string): string {
  const norm = filePath.replace(/\\/g, '/')
  const idx = norm.lastIndexOf('/')
  return idx === -1 ? '' : norm.slice(0, idx)
}

export function resolveMoveDirectoryPath(dirPath: string, destDirPath: string): string {
  const norm = dirPath.replace(/\\/g, '/')
  const dir = destDirPath.replace(/\\/g, '/')
  const name = norm.split('/').pop() ?? norm
  return dir ? `${dir}/${name}` : name
}

export function resolveMoveFilePath(filePath: string, destDirPath: string): string {
  const norm = filePath.replace(/\\/g, '/')
  const dir = destDirPath.replace(/\\/g, '/')
  const name = norm.split('/').pop() ?? norm
  return dir ? `${dir}/${name}` : name
}

/** Nur Dateiname (kein Pfad), gültige Zeichen für neue Dateien. */
export function normalizeRenameFileNameInput(input: string): string {
  const raw = input.trim().replace(/\\/g, '/')
  if (!raw) throw new Error('Dateiname fehlt.')
  const base = raw.includes('/') ? (raw.split('/').pop() ?? raw) : raw
  if (!base || base === '.' || base === '..') throw new Error('Ungültiger Dateiname.')
  if (/[/\\:*?"<>|]/.test(base)) {
    throw new Error('Dateiname enthält ungültige Zeichen.')
  }
  return base
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

export function pathIsUnderDir(ancestorDir: string, path: string): boolean {
  const a = ancestorDir.replace(/\\/g, '/')
  const p = path.replace(/\\/g, '/')
  if (!a) return true
  return p === a || p.startsWith(`${a}/`)
}

export function remapSubtreePath(fromRoot: string, newRoot: string, path: string): string {
  const norm = path.replace(/\\/g, '/')
  const from = fromRoot.replace(/\\/g, '/')
  const to = newRoot.replace(/\\/g, '/')
  if (norm === from) return to
  if (norm.startsWith(`${from}/`)) return `${to}/${norm.slice(from.length + 1)}`
  throw new Error('Pfad liegt nicht im verschobenen Ordner.')
}

export function occupiedPathsFromManifest(manifest: FileIndexManifest): Set<string> {
  return new Set(manifest.entries.map((e) => e.path.replace(/\\/g, '/')))
}

export function moveDirectoryValidationError(
  dirPath: string,
  destDirPath: string,
  occupiedPaths: Set<string>,
): string | null {
  const from = dirPath.replace(/\\/g, '/')
  const destDir = destDirPath.replace(/\\/g, '/')
  if (!from) return 'Der Workspace-Root kann nicht verschoben werden.'
  const newPath = resolveMoveDirectoryPath(from, destDir)
  if (newPath === from) return null
  if (pathIsUnderDir(from, destDir)) {
    return 'Ein Ordner kann nicht in sich selbst oder in einen Unterordner verschoben werden.'
  }
  if (occupiedPaths.has(newPath)) {
    return 'Im Zielordner existiert bereits ein Eintrag mit diesem Namen.'
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

async function ensureDirectoryForLogicalPath(
  store: FileSourceStore,
  relativeDir: string,
): Promise<void> {
  if (!relativeDir) return
  const vaultRoot = vaultRootForPath(relativeDir, new Set(store.vaultRoots ?? []))
  if (
    vaultRoot !== null &&
    isVaultUnlocked(vaultRoot) &&
    isPathUnderVaultRoot(relativeDir, vaultRoot)
  ) {
    await ensureVaultDirectoryOnDisk(store, vaultRoot, relativeDir)
    return
  }
  await ensureDirectoryOnDisk(store, relativeDir)
}

async function sidecarExists(store: FileSourceStore, sidecarPath: string): Promise<boolean> {
  try {
    await readTextFromStore(store, sidecarPath)
    return true
  } catch {
    return false
  }
}

async function copyFileWithSidecarInStore(
  store: FileSourceStore,
  from: string,
  newPath: string,
): Promise<void> {
  const blob = await readBlobFromStore(store, from)
  const fileName = from.split('/').pop() ?? 'file'
  const file = blob instanceof File ? blob : new File([await blob.arrayBuffer()], fileName)
  await writeBlobToStore(store, newPath, file)

  const oldSidecar = sidecarPathForFile(from)
  const newSidecar = sidecarPathForFile(newPath)
  if (await sidecarExists(store, oldSidecar)) {
    const text = await readTextFromStore(store, oldSidecar)
    const meta = parseFileMetadata(JSON.parse(text))
    meta.target.path = newPath
    meta.target.name = newPath.split('/').pop() ?? newPath
    const updated = serializeFileMetadata(meta)
    await writeTextToStore(store, newSidecar, updated)
  }
}

function subtreePaths(manifest: FileIndexManifest, dirPath: string): string[] {
  const from = dirPath.replace(/\\/g, '/')
  return manifest.entries
    .map((e) => e.path.replace(/\\/g, '/'))
    .filter((p) => p === from || p.startsWith(`${from}/`))
    .sort((a, b) => {
      const da = a.split('/').length
      const db = b.split('/').length
      if (da !== db) return da - db
      const ea = manifest.entries.find((x) => x.path === a)
      const eb = manifest.entries.find((x) => x.path === b)
      if (ea?.kind !== eb?.kind) return ea?.kind === 'directory' ? -1 : 1
      return a.localeCompare(b)
    })
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

  assertVaultUnlockedForWrite(store, newPath)
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

export async function moveDirectoryInStore(
  store: FileSourceStore,
  dirPath: string,
  destDirPath: string,
  manifest: FileIndexManifest,
): Promise<{ newPath: string; rows: RawFileRow[] }> {
  if (store.kind !== 'handles') {
    throw new Error('Verschieben nur mit Chrome/Edge und Schreibzugriff auf den Ordner.')
  }
  if (!(await ensureWritePermission(store))) {
    throw new Error('Schreibzugriff verweigert.')
  }

  const from = dirPath.replace(/\\/g, '/')
  const destDir = destDirPath.replace(/\\/g, '/')
  const occupied = occupiedPathsFromManifest(manifest)
  const err = moveDirectoryValidationError(from, destDir, occupied)
  if (err) throw new Error(err)
  const newPath = resolveMoveDirectoryPath(from, destDir)
  if (newPath === from) {
    throw new Error('Der Ordner liegt bereits in diesem Ziel.')
  }

  assertVaultUnlockedForWrite(store, newPath)
  const subtree = subtreePaths(manifest, from)
  for (const p of subtree) {
    const target = remapSubtreePath(from, newPath, p)
    assertVaultUnlockedForWrite(store, target)
  }

  const paths = subtreePaths(manifest, from)
  for (const p of paths) {
    const entry = manifest.entries.find((e) => e.path.replace(/\\/g, '/') === p)
    const target = remapSubtreePath(from, newPath, p)
    if (entry?.kind === 'directory') {
      await ensureDirectoryForLogicalPath(store, target)
    } else if (entry?.kind === 'file') {
      await copyFileWithSidecarInStore(store, p, target)
    }
  }

  await deletePathFromStore(store, from, 'directory')

  const rows: RawFileRow[] = []
  for (const p of paths) {
    const entry = manifest.entries.find((e) => e.path.replace(/\\/g, '/') === p)!
    const target = remapSubtreePath(from, newPath, p)
    if (entry.kind === 'directory') {
      rows.push(directoryRow(target))
      continue
    }
    rows.push({
      relativePath: target,
      name: target.split('/').pop() ?? target,
      kind: 'file',
      size: entry.size,
      lastModified: entry.lastModified ?? Date.now(),
    })
    const oldSidecar = sidecarPathForFile(p)
    const newSidecar = sidecarPathForFile(target)
    const sidecarEntry = manifest.entries.find((e) => e.path.replace(/\\/g, '/') === oldSidecar)
    if (sidecarEntry) {
      rows.push({
        relativePath: newSidecar,
        name: newSidecar.split('/').pop() ?? newSidecar,
        kind: 'file',
        size: sidecarEntry.size,
        lastModified: Date.now(),
      })
    }
  }

  return { newPath, rows }
}