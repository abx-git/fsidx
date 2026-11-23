/** Aufgaben-Dateityp: normale Datei im Ordner, kein `.et2/`. */
export const TSK_JSON_SUFFIX = '.tsk.json'

export function isTskJsonPath(relativePath: string): boolean {
  return relativePath.replace(/\\/g, '/').toLowerCase().endsWith(TSK_JSON_SUFFIX)
}

export function tskFileName(baseLabel: string, attempt = 0): string {
  const safe = baseLabel.trim().replace(/[/\\:*?"<>|]+/g, '-').replace(/\s+/g, ' ') || 'Aufgaben'
  const stem = attempt === 0 ? safe : `${safe}-${attempt + 1}`
  return `${stem}${TSK_JSON_SUFFIX}`
}

export function defaultNewTskPath(dirPath: string, attempt = 0): string {
  const name = tskFileName('Aufgaben', attempt)
  return dirPath ? `${dirPath}/${name}` : name
}