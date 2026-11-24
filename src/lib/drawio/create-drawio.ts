import type { RawFileRow } from '../build-manifest'
import type { FileSourceStore } from '../file-sources'
import { writeTextToStore } from '../file-sources'
import { sanitizeNewName } from '../create-workspace'
import { newDrawioFileXml } from './drawio-template'
import { drawioFileName, pickNewDrawioPath } from './drawio-paths'

export async function createDrawioInScope(
  store: FileSourceStore,
  parentPath: string,
  fileName?: string,
  indexedPaths: string[] = [],
): Promise<{ relativePath: string; row: RawFileRow; xml: string }> {
  let relativePath: string
  if (fileName?.trim()) {
    const safe = sanitizeNewName(fileName, 'Diagramm')
    const name = safe.toLowerCase().endsWith('.drawio') ? safe : drawioFileName(safe.replace(/\.drawio$/i, ''))
    relativePath = parentPath ? `${parentPath}/${name}` : name
  } else {
    relativePath = pickNewDrawioPath(parentPath, indexedPaths)
  }
  const xml = newDrawioFileXml()
  await writeTextToStore(store, relativePath, xml)
  const name = relativePath.split('/').pop() ?? relativePath
  const row: RawFileRow = {
    relativePath,
    name,
    kind: 'file',
    size: new Blob([xml]).size,
    lastModified: Date.now(),
  }
  return { relativePath, row, xml }
}