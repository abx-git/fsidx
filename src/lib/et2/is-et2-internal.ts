import { ET2_DIR } from './paths'

/** Pfade unter `.et2/` im Datei-Modus standardmäßig ausblenden. */
export function isEt2InternalPath(relativePath: string, showEt2DotFiles: boolean): boolean {
  if (showEt2DotFiles) return false
  const norm = relativePath.replace(/\\/g, '/')
  return norm.includes(`/${ET2_DIR}/`) || norm.startsWith(`${ET2_DIR}/`)
}