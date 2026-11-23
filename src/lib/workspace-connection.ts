import type { FileSourceStore } from './file-sources'
import { canWriteToStore } from './file-sources'

export type WorkspaceConnectionState = 'write' | 'read_only' | 'disconnected'

export function getWorkspaceConnectionState(
  fileSources: FileSourceStore | null,
): WorkspaceConnectionState {
  if (!fileSources) return 'disconnected'
  if (canWriteToStore(fileSources)) return 'write'
  return 'read_only'
}

export function formatScopeLabel(scopePath: string, rootName?: string): string {
  if (!scopePath) return rootName ? `Stamm (${rootName})` : 'Stammordner'
  const last = scopePath.split('/').pop() ?? scopePath
  return last
}