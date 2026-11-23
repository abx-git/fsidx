import { isEt2InternalPath } from './et2/is-et2-internal'

/** Legacy-`.et2`-Ordner im Baum ausblenden (außer „anzeigen“ aktiv). */
export function shouldShowDirectoryInTree(relativePath: string, showEt2DotFiles: boolean): boolean {
  if (showEt2DotFiles) return true
  const norm = relativePath.replace(/\\/g, '/')
  if (norm === '.et2' || norm.endsWith('/.et2')) return false
  return !norm.includes('/.et2/')
}

export function isIndexedFileInTree(relativePath: string, showEt2DotFiles: boolean): boolean {
  return !isEt2InternalPath(relativePath, showEt2DotFiles)
}