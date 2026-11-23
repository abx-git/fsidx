import { ET2_DIR } from './et2/paths'

/** Scope nicht in versteckte `.et2/`-Pfade springen lassen. */
export function sanitizeScopePath(scopePath: string, showEt2DotFiles: boolean): string {
  if (showEt2DotFiles) return scopePath
  const norm = scopePath.replace(/\\/g, '/').replace(/\/$/, '')
  if (norm === ET2_DIR || norm.startsWith(`${ET2_DIR}/`)) return ''
  const marker = `/${ET2_DIR}/`
  const idx = norm.indexOf(marker)
  if (idx === -1) return norm
  return norm.slice(0, idx)
}

export function isHiddenEt2Scope(scopePath: string, showEt2DotFiles: boolean): boolean {
  if (showEt2DotFiles) return false
  const norm = scopePath.replace(/\\/g, '/')
  return norm.includes(`/${ET2_DIR}/`) || norm === ET2_DIR || norm.endsWith(`/${ET2_DIR}`)
}