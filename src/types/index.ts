/** JSON manifest produced when a folder is indexed (Airbase-style navigation graph). */
export interface FileIndexManifest {
  version: 1
  indexedAt: string
  rootName: string
  stats: ManifestStats
  tree: IndexNode
  entries: IndexEntry[]
}

export interface ManifestStats {
  files: number
  directories: number
  totalBytes: number
  maxDepth: number
}

export type NodeKind = 'directory' | 'file'

export interface IndexNode {
  id: string
  kind: NodeKind
  name: string
  /** Relative path from the chosen root, POSIX-style */
  path: string
  depth: number
  extension?: string
  mimeHint?: string
  size?: number
  lastModified?: number
  children?: IndexNode[]
}

/** Flat search index derived from the tree */
export interface IndexEntry {
  id: string
  kind: NodeKind
  name: string
  path: string
  parentPath: string
  depth: number
  extension?: string
  size?: number
  lastModified?: number
  /** Lowercased fields concatenated for client-side search */
  searchText: string
}

export type IndexingPhase = 'idle' | 'reading' | 'building' | 'indexing' | 'ready' | 'error'

export interface IndexingProgress {
  phase: IndexingPhase
  scanned: number
  message?: string
}