/** Anzeige-Pfad: Stammordner + relativer Index-Pfad (POSIX `/`). */
export function indexedEntryFullPath(workspaceRootName: string, relativePath: string): string {
  const root = workspaceRootName.trim() || 'Workspace'
  const rel = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  return rel ? `${root}/${rel}` : root
}