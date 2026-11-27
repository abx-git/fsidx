/** POSIX-Pfad relativ zum geöffneten Workspace-Stamm (leer = Stamm). */
export function scopeRelativePosix(scopePath: string): string {
  const norm = scopePath.replace(/\\/g, '/').replace(/^\/+/, '')
  return norm || '.'
}

/** `cd`-Befehl relativ zum Ordner, den du in fsidx geöffnet hast (bash/zsh). */
export function buildBashCdFromWorkspaceRoot(scopePath: string): string | null {
  const rel = scopeRelativePosix(scopePath)
  if (rel === '.') return null
  return `cd ${posixShellQuoteAlways(rel)}`
}

function posixShellQuoteAlways(segment: string): string {
  return `'${segment.replace(/'/g, `'\\''`)}'`
}

/** PowerShell-Befehl relativ zum Workspace-Stamm. */
export function buildPowershellCdFromWorkspaceRoot(scopePath: string): string | null {
  const rel = scopeRelativePosix(scopePath)
  if (rel === '.') return null
  const win = rel.replace(/\//g, '\\')
  return `Set-Location -LiteralPath '${win.replace(/'/g, "''")}'`
}

export function scopeDisplayLabel(workspaceRootName: string, scopePath: string): string {
  const rel = scopeRelativePosix(scopePath)
  if (rel === '.') return workspaceRootName || '(Workspace-Stamm)'
  const leaf = rel.split('/').pop() ?? rel
  return `${workspaceRootName} / ${leaf}`
}