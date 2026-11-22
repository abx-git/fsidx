export const FILE_METADATA_SCHEMA_ID =
  'https://abx-git.github.io/fsidx/schemas/file-metadata.v1.schema.json'

export interface FileMetadataTarget {
  path: string
  name: string
}

export interface FileMetadataRelation {
  path: string
  kind: 'related' | 'parent' | 'child' | 'see-also'
  label?: string
}

/** Sidecar-Dokument (Version 1), erweiterbar via `extensions` und weitere Top-Level-Felder */
export interface FileMetadataV1 {
  $schema?: string
  version: 1
  target: FileMetadataTarget
  title?: string
  summary?: string
  tags?: string[]
  status?: 'draft' | 'review' | 'done' | 'archived'
  relations?: FileMetadataRelation[]
  extensions?: Record<string, unknown>
  [key: string]: unknown
}