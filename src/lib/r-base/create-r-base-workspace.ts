import type { RawFileRow } from '../build-manifest'
import type { FileSourceStore } from '../file-sources'
import { writeTextToStore } from '../file-sources'
import { createDirectoryInScope, sanitizeNewName } from '../create-workspace'
import { RBASE_DATASET_META_FILENAME, RBASE_PROJECT_FILENAME } from './r-base-paths'
import { rBaseRootFromProjectPath } from './rbase-roots'

export function projectConfigPathForScope(scopePath: string): string {
  const norm = scopePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  return norm ? `${norm}/${RBASE_PROJECT_FILENAME}` : RBASE_PROJECT_FILENAME
}

export function defaultRBaseProjectJsonText(): string {
  const doc = {
    configVersion: 1,
    settings: {
      ui: { showObsoleteFieldsInDetail: false },
    },
  }
  return `${JSON.stringify(doc, null, 2)}\n`
}

export function defaultRBaseDatasetMetaText(locId: string, bezeichnung: string): string {
  const now = new Date().toISOString()
  const doc = {
    schemaVersion: 1,
    locId: locId.trim(),
    bezeichnung: bezeichnung.trim() || locId.trim(),
    kategorie: '',
    lastModified: now,
    notes: '',
    tags: [] as string[],
    files: [] as unknown[],
    sync: { lastSyncedAt: null, remoteEtag: null },
  }
  return `${JSON.stringify(doc, null, 2)}\n`
}

export function suggestNextLocId(indexedPaths: readonly string[], workspaceRoot: string): string {
  const prefix = workspaceRoot.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  const rootPrefix = prefix ? `${prefix}/` : ''
  let max = 0
  for (const raw of indexedPaths) {
    const p = raw.replace(/\\/g, '/')
    if (!p.startsWith(rootPrefix) || !p.endsWith(`/${RBASE_DATASET_META_FILENAME}`)) continue
    const rel = prefix ? p.slice(rootPrefix.length) : p
    const m = rel.match(/^(RUD-(\d+))\/meta\.json$/i)
    if (m) {
      const n = Number.parseInt(m[2], 10)
      if (Number.isFinite(n)) max = Math.max(max, n)
    }
    if (!prefix && p === RBASE_DATASET_META_FILENAME) max = Math.max(max, 1)
  }
  return `RUD-${String(max + 1).padStart(4, '0')}`
}

export async function createRBaseWorkspaceAtScope(
  store: FileSourceStore,
  scopePath: string,
  options?: {
    datasetFolderName?: string
    locId?: string
    bezeichnung?: string
  },
): Promise<{ rows: RawFileRow[]; rbaseRoot: string; projectPath: string }> {
  const normScope = scopePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  const projectPath = projectConfigPathForScope(normScope)
  const json = defaultRBaseProjectJsonText()
  await writeTextToStore(store, projectPath, json)
  const rbaseRoot = rBaseRootFromProjectPath(projectPath)
  const rows: RawFileRow[] = [
    {
      relativePath: projectPath,
      name: RBASE_PROJECT_FILENAME,
      kind: 'file',
      size: new Blob([json]).size,
      lastModified: Date.now(),
    },
  ]

  if (options?.datasetFolderName?.trim()) {
    const dataset = await createRBaseDatasetInScope(
      store,
      normScope,
      options.datasetFolderName,
      options.locId ?? 'RUD-0001',
      options.bezeichnung ?? options.datasetFolderName,
    )
    rows.push(...dataset.rows)
  }

  return { rows, rbaseRoot, projectPath }
}

export async function createRBaseDatasetInScope(
  store: FileSourceStore,
  parentPath: string,
  folderName: string,
  locId: string,
  bezeichnung: string,
): Promise<{ rows: RawFileRow[]; datasetDir: string; metaPath: string }> {
  const safe = sanitizeNewName(folderName, 'Datensatz')
  const { relativePath: datasetDir, row: dirRow } = await createDirectoryInScope(
    store,
    parentPath,
    safe,
  )
  const metaPath = `${datasetDir}/${RBASE_DATASET_META_FILENAME}`
  const metaText = defaultRBaseDatasetMetaText(locId, bezeichnung)
  await writeTextToStore(store, metaPath, metaText)
  const rows: RawFileRow[] = [
    dirRow,
    {
      relativePath: metaPath,
      name: RBASE_DATASET_META_FILENAME,
      kind: 'file',
      size: new Blob([metaText]).size,
      lastModified: Date.now(),
    },
  ]
  return { rows, datasetDir, metaPath }
}