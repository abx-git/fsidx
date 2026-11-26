export const RBASE_APP_ORIGIN =
  (import.meta.env.VITE_RBASE_APP_ORIGIN as string | undefined)?.replace(/\/$/, '') ??
  'https://abx-git.github.io/r-base/'

export const RBASE_PENDING_LOC_STORAGE_KEY = 'r-base.pendingLocId'

export function buildRBaseOpenTabUrl(metaOrProjectPath: string): string {
  const base = (import.meta.env.BASE_URL as string) || '/'
  const url = new URL('rbase-open.html', window.location.origin + base)
  url.searchParams.set('path', metaOrProjectPath)
  return url.href
}

export function openRBaseOpenTab(relativePath: string): void {
  window.open(buildRBaseOpenTabUrl(relativePath), '_blank', 'noopener,noreferrer')
}

export function openRBaseApp(locId?: string | null): void {
  if (locId?.trim()) {
    try {
      sessionStorage.setItem(RBASE_PENDING_LOC_STORAGE_KEY, locId.trim())
    } catch {
      /* quota / private mode */
    }
  }
  window.open(RBASE_APP_ORIGIN, '_blank', 'noopener,noreferrer')
}

/** Relativer Workspace-Pfad für ?path= */
export function normalizeRBaseOpenPathParam(raw: string | null): string | null {
  if (!raw?.trim()) return null
  const path = raw.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!path || path.includes('..')) return null
  const lower = path.toLowerCase()
  if (lower.endsWith('/meta.json') || lower === 'meta.json') return path
  if (lower.endsWith('r-base.project.json')) return path
  return null
}