export const E2_JSON_SUFFIX = '.e2.json'

export function isE2JsonPath(path: string): boolean {
  return path.toLowerCase().endsWith(E2_JSON_SUFFIX)
}

export function e2FileName(title: string): string {
  const base = title.trim() || 'Board'
  const safe = base.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ')
  return `${safe}.e2.json`
}

export function pickNewE2Path(parentPath: string, indexedPaths: string[]): string {
  const base = parentPath ? `${parentPath}/` : ''
  let n = 1
  let name = 'Board.e2.json'
  const existing = new Set(indexedPaths.map((p) => p.toLowerCase()))
  while (existing.has(`${base}${name}`.toLowerCase())) {
    n += 1
    name = `Board-${n}.e2.json`
  }
  return `${base}${name}`
}

export function isE2BoardSnapshotText(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{')) return false
  try {
    const doc = JSON.parse(trimmed) as Record<string, unknown>
    const format = doc.format
    const version = doc.version
    if (format !== undefined && format !== 'event-storming-tool') return false
    if (version === 1) return Array.isArray(doc.elements)
    if (version === 2 || version === '2') return Array.isArray(doc.views)
    if (Array.isArray(doc.views)) return true
    return false
  } catch {
    return false
  }
}