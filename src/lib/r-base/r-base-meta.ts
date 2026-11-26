export type RBaseFileUserMeta = {
  title?: string
  description?: string
  capturedAt?: string | null
  tags?: string[]
}

export type RBaseMetaFileEntry = {
  path: string
  sha256: string
  size: number
  mime: string
  lastModified: string
  meta?: RBaseFileUserMeta
}

export type RBaseDatasetMeta = {
  schemaVersion: number
  locId: string
  schemaKey?: string
  bezeichnung: string
  kategorie: string
  lastModified: string
  notes: string
  tags: string[]
  files: RBaseMetaFileEntry[]
  sync?: {
    lastSyncedAt: string | null
    remoteEtag: string | null
  }
  data?: Record<string, unknown>
}

export type RBaseProjectConfigFile = {
  configVersion: number
  schemas?: unknown
  settings?: {
    webdav?: { baseUrl?: string; username?: string }
    ui?: { showObsoleteFieldsInDetail?: boolean }
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function parseRBaseDatasetMeta(json: unknown): RBaseDatasetMeta | null {
  if (!isRecord(json)) return null
  if (json.schemaVersion !== 1) return null
  const locId = typeof json.locId === 'string' ? json.locId.trim() : ''
  if (!locId) return null
  const filesRaw = json.files
  if (!Array.isArray(filesRaw)) return null
  const files: RBaseMetaFileEntry[] = []
  for (const item of filesRaw) {
    if (!isRecord(item)) continue
    const path = typeof item.path === 'string' ? item.path.replace(/\\/g, '/') : ''
    if (!path) continue
    files.push({
      path,
      sha256: typeof item.sha256 === 'string' ? item.sha256 : '',
      size: typeof item.size === 'number' && Number.isFinite(item.size) ? item.size : 0,
      mime: typeof item.mime === 'string' ? item.mime : 'application/octet-stream',
      lastModified: typeof item.lastModified === 'string' ? item.lastModified : '',
      meta: isRecord(item.meta) ? (item.meta as RBaseFileUserMeta) : undefined,
    })
  }
  return {
    schemaVersion: 1,
    locId,
    schemaKey: typeof json.schemaKey === 'string' ? json.schemaKey : undefined,
    bezeichnung: typeof json.bezeichnung === 'string' ? json.bezeichnung : '',
    kategorie: typeof json.kategorie === 'string' ? json.kategorie : '',
    lastModified: typeof json.lastModified === 'string' ? json.lastModified : '',
    notes: typeof json.notes === 'string' ? json.notes : '',
    tags: Array.isArray(json.tags)
      ? json.tags.map((t) => (typeof t === 'string' ? t : '')).filter(Boolean)
      : [],
    files,
    sync: isRecord(json.sync)
      ? {
          lastSyncedAt:
            json.sync.lastSyncedAt === null
              ? null
              : typeof json.sync.lastSyncedAt === 'string'
                ? json.sync.lastSyncedAt
                : null,
          remoteEtag:
            json.sync.remoteEtag === null
              ? null
              : typeof json.sync.remoteEtag === 'string'
                ? json.sync.remoteEtag
                : null,
        }
      : undefined,
    data: isRecord(json.data) ? json.data : undefined,
  }
}

export function isRBaseDatasetMetaText(text: string): boolean {
  try {
    return parseRBaseDatasetMeta(JSON.parse(text)) !== null
  } catch {
    return false
  }
}

export function parseRBaseProjectConfig(json: unknown): RBaseProjectConfigFile | null {
  if (!isRecord(json)) return null
  if (json.configVersion !== 1) return null
  return json as RBaseProjectConfigFile
}

export function isRBaseProjectConfigText(text: string): boolean {
  try {
    return parseRBaseProjectConfig(JSON.parse(text)) !== null
  } catch {
    return false
  }
}