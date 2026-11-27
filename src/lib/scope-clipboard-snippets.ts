import { indexedEntryFullPath } from './indexed-path'
import { scopeRelativePosix } from './scope-terminal-snippet'

function shellQuoteSingle(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** Relativer POSIX-Pfad im Workspace (Datei oder Scope). */
export function workspaceRelativePosixPath(path: string): string {
  const norm = path.replace(/\\/g, '/').replace(/^\/+/, '')
  return norm || '.'
}

export function buildDisplayRelativePath(workspaceRootName: string, path: string): string {
  return indexedEntryFullPath(workspaceRootName, path.replace(/^\/+/, ''))
}

export function buildGitStatusSnippet(scopePath: string): string {
  const rel = scopeRelativePosix(scopePath)
  if (rel === '.') return 'git status'
  return `git status -- ${shellQuoteSingle(rel)}`
}

export function buildGitLogSnippet(scopePath: string): string {
  const rel = scopeRelativePosix(scopePath)
  if (rel === '.') return 'git log --oneline -15'
  return `git log --oneline -15 -- ${shellQuoteSingle(rel)}`
}

export function joinAbsWorkspacePath(absWorkspaceRoot: string, relativePosix: string): string {
  const base = absWorkspaceRoot.replace(/[/\\]+$/, '')
  if (!base) return ''
  if (!relativePosix || relativePosix === '.') return base
  const sub = relativePosix.replace(/\\/g, '/').replace(/^\/+/, '')
  return `${base}/${sub}`
}

export function buildCursorOpenFolder(absWorkspaceRoot: string, scopePath: string): string | null {
  const joined = joinAbsWorkspacePath(absWorkspaceRoot, scopeRelativePosix(scopePath))
  if (!joined) return null
  return `cursor ${shellQuoteSingle(joined)}`
}

export function buildVscodeOpenFolder(absWorkspaceRoot: string, scopePath: string): string | null {
  const joined = joinAbsWorkspacePath(absWorkspaceRoot, scopeRelativePosix(scopePath))
  if (!joined) return null
  return `code ${shellQuoteSingle(joined)}`
}

export function buildCursorOpenFile(absWorkspaceRoot: string, filePath: string): string | null {
  const joined = joinAbsWorkspacePath(absWorkspaceRoot, workspaceRelativePosixPath(filePath))
  if (!joined) return null
  return `cursor ${shellQuoteSingle(joined)}`
}