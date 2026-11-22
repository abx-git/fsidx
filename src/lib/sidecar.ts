import type { FileMetadataV1 } from '../types/file-metadata'
import { FILE_METADATA_SCHEMA_ID } from '../types/file-metadata'

/** Sidecar-Pfad: gleicher Name wie die Datei + `.json` (z. B. `notes/readme.md` → `notes/readme.md.json`) */
export function sidecarPathForFile(filePath: string): string {
  return `${filePath}.json`
}

export function targetPathFromSidecar(sidecarPath: string): string | null {
  if (!sidecarPath.endsWith('.json')) return null
  return sidecarPath.slice(0, -'.json'.length)
}

export function isSidecarForIndexedFile(
  path: string,
  indexedFilePaths: Set<string>,
): boolean {
  const target = targetPathFromSidecar(path)
  return target != null && indexedFilePaths.has(target)
}

export function createDefaultFileMetadata(
  targetPath: string,
  targetName: string,
): FileMetadataV1 {
  return {
    $schema: FILE_METADATA_SCHEMA_ID,
    version: 1,
    target: { path: targetPath, name: targetName },
    title: '',
    summary: '',
    tags: [],
    status: 'draft',
    relations: [],
    extensions: {},
  }
}

export function parseFileMetadata(json: unknown): FileMetadataV1 {
  const data = json as FileMetadataV1
  if (data?.version !== 1 || !data.target?.path) {
    throw new Error('Ungültiges Metadaten-JSON: version 1 mit target erforderlich.')
  }
  return data
}

export function serializeFileMetadata(data: FileMetadataV1): string {
  return `${JSON.stringify(data, null, 2)}\n`
}