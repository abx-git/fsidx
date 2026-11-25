import type { RawFileRow } from '../build-manifest'
import type { FileSourceStore } from '../file-sources'
import { writeTextToStore } from '../file-sources'
import { sanitizeNewName } from '../create-workspace'
import { newE2BoardJson } from './e2-board-template'
import { e2FileName, pickNewE2Path } from './e2-board-paths'

export async function createE2BoardInScope(
  store: FileSourceStore,
  parentPath: string,
  fileName?: string,
  indexedPaths: string[] = [],
  title?: string,
): Promise<{ relativePath: string; row: RawFileRow; json: string }> {
  let relativePath: string
  if (fileName?.trim()) {
    const safe = sanitizeNewName(fileName, 'Board')
    const name = safe.toLowerCase().endsWith('.e2.json') ? safe : e2FileName(safe.replace(/\.e2\.json$/i, ''))
    relativePath = parentPath ? `${parentPath}/${name}` : name
  } else {
    relativePath = pickNewE2Path(parentPath, indexedPaths)
  }
  const boardTitle = title?.trim() || relativePath.split('/').pop()?.replace(/\.e2\.json$/i, '') || 'Neues Board'
  const json = newE2BoardJson(boardTitle)
  await writeTextToStore(store, relativePath, json)
  const name = relativePath.split('/').pop() ?? relativePath
  const row: RawFileRow = {
    relativePath,
    name,
    kind: 'file',
    size: new Blob([json]).size,
    lastModified: Date.now(),
  }
  return { relativePath, row, json }
}