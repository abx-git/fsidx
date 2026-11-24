import type { RawFileRow } from '../build-manifest'
import type { FileSourceStore } from '../file-sources'
import { writeTextToStore } from '../file-sources'
import { FSIDX_LINK_FORMAT, type FsidxLinkFile } from '../../types/link-file'
import { isLinkJsonPath, LINK_JSON_SUFFIX, linkFileName, pickNewLinkPath } from './link-paths'

export function normalizeLinkUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('URL fehlt.')
  let url: URL
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
  } catch {
    throw new Error('Ungültige URL.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Nur http(s)-URLs sind erlaubt.')
  }
  return url.href
}

export function emptyLinkFile(title: string, url: string): FsidxLinkFile {
  return {
    format: FSIDX_LINK_FORMAT,
    version: 1,
    title: title.trim() || 'Link',
    url: normalizeLinkUrl(url),
    note: '',
  }
}

export function parseLinkFile(text: string): FsidxLinkFile {
  let raw: unknown
  try {
    raw = JSON.parse(text) as unknown
  } catch {
    throw new Error('Kein gültiges JSON.')
  }
  if (!raw || typeof raw !== 'object') throw new Error('Ungültige Link-Datei.')
  const o = raw as Partial<FsidxLinkFile>
  if (o.format !== FSIDX_LINK_FORMAT || o.version !== 1) {
    throw new Error('Erwartet format fsidx-link-v1, version 1.')
  }
  if (!o.url || typeof o.url !== 'string') throw new Error('Feld url fehlt.')
  const title = typeof o.title === 'string' ? o.title : 'Link'
  return {
    format: FSIDX_LINK_FORMAT,
    version: 1,
    title,
    url: normalizeLinkUrl(o.url),
    note: typeof o.note === 'string' ? o.note : '',
  }
}

export function serializeLinkFile(doc: FsidxLinkFile): string {
  const normalized: FsidxLinkFile = {
    ...doc,
    title: doc.title.trim() || 'Link',
    url: normalizeLinkUrl(doc.url),
    note: doc.note?.trim() ?? '',
  }
  return `${JSON.stringify(normalized, null, 2)}\n`
}

export async function writeLinkFileToStore(
  store: FileSourceStore,
  relativePath: string,
  doc: FsidxLinkFile,
): Promise<{ row: RawFileRow; text: string }> {
  if (!isLinkJsonPath(relativePath)) {
    throw new Error('Pfad muss auf .link.json enden.')
  }
  const text = serializeLinkFile(doc)
  await writeTextToStore(store, relativePath, text)
  const name = relativePath.split('/').pop() ?? relativePath
  const row: RawFileRow = {
    relativePath,
    name,
    kind: 'file',
    size: new Blob([text]).size,
    lastModified: Date.now(),
  }
  return { row, text }
}

export async function createNewLinkFile(
  store: FileSourceStore,
  dirPath: string,
  options: { url: string; title?: string; indexedPaths?: string[]; fileName?: string },
): Promise<{ linkPath: string; row: RawFileRow }> {
  const indexed = options.indexedPaths ?? []
  let linkPath: string
  if (options.fileName?.trim()) {
    const fn = options.fileName.trim()
    const name = fn.toLowerCase().endsWith(LINK_JSON_SUFFIX)
      ? fn
      : linkFileName(fn.replace(/\.json$/i, ''))
    linkPath = dirPath ? `${dirPath}/${name}` : name
  } else {
    linkPath = pickNewLinkPath(dirPath, indexed)
  }
  const title = options.title?.trim() || 'Link'
  const doc = emptyLinkFile(title, options.url)
  const { row } = await writeLinkFileToStore(store, linkPath, doc)
  return { linkPath, row }
}