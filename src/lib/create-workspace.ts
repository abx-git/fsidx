import type { RawFileRow } from './build-manifest'
import type { FileSourceStore } from './file-sources'
import { writeTextToStore } from './file-sources'
import { sanitizePathSegment } from './et2/sanitize-segment'
import { isVaultUnlocked } from './vault/vault-session'
import { vaultRootForPath } from './vault/vault-paths'
import { writeTextToVaultStore } from './vault/vault-io'
export function sanitizeNewName(input: string, fallback: string): string {
  const trimmed = input.trim()
  const base = sanitizePathSegment(trimmed || fallback, fallback)
  return base.replace(/\/+/g, '-')
}

export async function ensureDirectoryOnDisk(
  store: FileSourceStore,
  relativeDir: string,
): Promise<void> {
  if (store.kind !== 'handles') {
    throw new Error('Ordner anlegen: Chrome/Edge mit Schreibzugriff.')
  }
  if (!relativeDir) return
  let current = store.root
  for (const segment of relativeDir.split('/').filter(Boolean)) {
    current = await current.getDirectoryHandle(segment, { create: true })
  }
}

export function directoryRow(relativePath: string): RawFileRow {
  const name = relativePath.split('/').pop() ?? relativePath
  return {
    relativePath,
    name,
    kind: 'directory',
    lastModified: Date.now(),
  }
}

export async function createDirectoryInScope(
  store: FileSourceStore,
  parentPath: string,
  folderName: string,
): Promise<{ relativePath: string; row: RawFileRow }> {
  const safe = sanitizeNewName(folderName, 'Neuer Ordner')
  const relativePath = parentPath ? `${parentPath}/${safe}` : safe
  await ensureDirectoryOnDisk(store, relativePath)
  return { relativePath, row: directoryRow(relativePath) }
}

export async function createMarkdownInScope(
  store: FileSourceStore,
  parentPath: string,
  fileName: string,
  title?: string,
): Promise<{ relativePath: string; row: RawFileRow }> {
  let safe = fileName.trim()
  if (!safe) safe = 'notiz.md'
  if (!/\.(md|markdown)$/i.test(safe)) safe = `${safe}.md`
  if (safe.includes('/') || safe.includes('\\')) {
    throw new Error('Ungültiger Dateiname')
  }
  const relativePath = parentPath ? `${parentPath}/${safe}` : safe
  const heading = title?.trim() || safe.replace(/\.(md|markdown)$/i, '')
  const text = `# ${heading}\n\n`
  const vaultRoot = vaultRootForPath(relativePath, new Set(store.vaultRoots ?? []))
  if (vaultRoot && isVaultUnlocked(vaultRoot)) {
    await writeTextToVaultStore(store, relativePath, text)
  } else {
    await writeTextToStore(store, relativePath, text)
  }
  const row: RawFileRow = {
    relativePath,
    name: safe,
    kind: 'file',
    size: new Blob([text]).size,
    lastModified: Date.now(),
  }
  return { relativePath, row }
}
