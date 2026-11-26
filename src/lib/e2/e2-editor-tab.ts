/** Relativer Workspace-Pfad für ?path= (kein .., kein führendes /). */
export function normalizeE2EditorPathParam(raw: string | null): string | null {
  if (!raw?.trim()) return null
  const path = raw.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!path || path.includes('..')) return null
  if (!path.toLowerCase().endsWith('.e2.json')) return null
  return path
}

export function buildE2EditorTabUrl(relativePath: string): string {
  const base = (import.meta.env.BASE_URL as string) || '/'
  const url = new URL('e2-edit.html', window.location.origin + base)
  url.searchParams.set('path', relativePath)
  return url.href
}

export function openE2EditorTab(relativePath: string): void {
  window.open(buildE2EditorTabUrl(relativePath), '_blank', 'noopener,noreferrer')
}