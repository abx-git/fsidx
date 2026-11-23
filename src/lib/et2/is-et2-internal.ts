import { ET2_DIR } from './paths'

/** Liegt der Pfad im alten ET2-Systemordner `.et2/`? */
export function pathIsUnderLegacyEt2(relativePath: string): boolean {
  const norm = relativePath.replace(/\\/g, '/')
  return norm === ET2_DIR || norm.startsWith(`${ET2_DIR}/`) || norm.includes(`/${ET2_DIR}/`)
}

export function workspaceHasLegacyEt2(indexedPaths: Iterable<string>): boolean {
  for (const path of indexedPaths) {
    if (pathIsUnderLegacyEt2(path)) return true
  }
  return false
}

/** Pfade unter `.et2/` im Datei-Modus standardmäßig ausblenden. */
export function isEt2InternalPath(relativePath: string, showEt2DotFiles: boolean): boolean {
  if (showEt2DotFiles) return false
  const norm = relativePath.replace(/\\/g, '/')
  return norm.includes(`/${ET2_DIR}/`) || norm.startsWith(`${ET2_DIR}/`)
}