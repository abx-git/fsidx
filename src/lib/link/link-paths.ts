export const LINK_JSON_SUFFIX = '.link.json'

export function isLinkJsonPath(relativePath: string): boolean {
  return relativePath.replace(/\\/g, '/').toLowerCase().endsWith(LINK_JSON_SUFFIX)
}

export function linkFileName(baseLabel: string, attempt = 0): string {
  const safe = baseLabel.trim().replace(/[/\\:*?"<>|]+/g, '-').replace(/\s+/g, ' ') || 'Link'
  const stem = attempt === 0 ? safe : `${safe}-${attempt + 1}`
  return `${stem}${LINK_JSON_SUFFIX}`
}

export function defaultNewLinkPath(dirPath: string, attempt = 0): string {
  const name = linkFileName('Link', attempt)
  return dirPath ? `${dirPath}/${name}` : name
}

export function pickNewLinkPath(dirPath: string, indexedPaths: string[]): string {
  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate = defaultNewLinkPath(dirPath, attempt)
    if (!indexedPaths.includes(candidate)) return candidate
  }
  return defaultNewLinkPath(dirPath, Date.now() % 1000)
}