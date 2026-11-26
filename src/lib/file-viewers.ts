import { extensionFromName } from './mime-hint'
import { isMarkdownPath } from './file-sources'
import { isOpenDocumentTextExtension, isSpreadsheetExtension } from './open-document-preview'
import { isLinkJsonPath } from './link/link-paths'
import { isDrawioPath } from './drawio'
import { isE2JsonPath } from './e2/e2-board-paths'
import { isRBaseIndexedPath } from './r-base/r-base-paths'

export type FileViewerKind =
  | 'markdown'
  | 'image'
  | 'diagram'
  | 'e2-board'
  | 'r-base'
  | 'text'
  | 'json'
  | 'link'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'spreadsheet'
  | 'opendocument'
  | 'binary'

export interface ViewerMenuOption {
  kind: FileViewerKind
  label: string
}

const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'])
const DIAGRAM = new Set(['puml', 'plantuml', 'iuml', 'wsd', 'mmd', 'mermaid'])
const TEXT = new Set([
  'txt',
  'log',
  'csv',
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'css',
  'scss',
  'html',
  'htm',
  'xml',
  'yaml',
  'yml',
  'toml',
  'ini',
  'env',
  'sh',
  'bash',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'c',
  'h',
  'cpp',
  'hpp',
  'sql',
  'vue',
  'svelte',
])
const JSON_EXT = new Set(['json', 'jsonc', 'json5'])
const PDF = new Set(['pdf'])
const AUDIO = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'weba'])
const VIDEO = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv'])

const MENU_LABELS: Record<FileViewerKind, string> = {
  markdown: 'Markdown (Lesen / Bearbeiten)',
  image: 'Bildvorschau',
  diagram: 'Diagramm (Mermaid / PlantUML / draw.io)',
  'e2-board': 'E2 Domänenmodell (Event Storming / DDD)',
  'r-base': 'R-Base (Datensatz / Workspace)',
  text: 'Text / Quellcode',
  json: 'JSON (formatiert)',
  link: 'Web-Link (eingebettet)',
  pdf: 'PDF',
  audio: 'Audio abspielen',
  video: 'Video abspielen',
  spreadsheet: 'Tabelle (ODS / Excel)',
  opendocument: 'OpenDocument (Text / Folien)',
  binary: 'Datei-Info & Download',
}

export function fileExtension(path: string, ext?: string): string {
  return (ext ?? extensionFromName(path) ?? '').toLowerCase()
}

export function viewerOptionsForFile(path: string, ext?: string): ViewerMenuOption[] {
  const e = fileExtension(path, ext)
  const kinds = new Set<FileViewerKind>()

  if (isMarkdownPath(path)) kinds.add('markdown')
  if (IMAGE.has(e)) kinds.add('image')
  if (isE2JsonPath(path)) kinds.add('e2-board')
  if (isRBaseIndexedPath(path)) kinds.add('r-base')
  if (DIAGRAM.has(e) || isDrawioPath(path)) kinds.add('diagram')
  if (PDF.has(e)) kinds.add('pdf')
  if (AUDIO.has(e)) kinds.add('audio')
  if (VIDEO.has(e)) kinds.add('video')
  if (isSpreadsheetExtension(e)) kinds.add('spreadsheet')
  if (isOpenDocumentTextExtension(e)) kinds.add('opendocument')
  if (isLinkJsonPath(path)) kinds.add('link')
  if (JSON_EXT.has(e) && !isLinkJsonPath(path)) {
    kinds.add('json')
    kinds.add('text')
  }
  if (TEXT.has(e)) kinds.add('text')
  if (kinds.size === 0) kinds.add('binary')
  kinds.add('binary')

  const order: FileViewerKind[] = [
    'markdown',
    'e2-board',
    'r-base',
    'diagram',
    'image',
    'pdf',
    'video',
    'audio',
    'link',
    'json',
    'text',
    'spreadsheet',
    'opendocument',
    'binary',
  ]

  return order
    .filter((k) => kinds.has(k))
    .map((kind) => ({ kind, label: MENU_LABELS[kind] }))
}

export function defaultViewerForFile(path: string, ext?: string): FileViewerKind {
  const e = fileExtension(path, ext)
  if (isMarkdownPath(path)) return 'markdown'
  if (isE2JsonPath(path)) return 'e2-board'
  if (isRBaseIndexedPath(path)) return 'r-base'
  if (isDrawioPath(path)) return 'diagram'
  if (DIAGRAM.has(e)) return 'diagram'
  if (IMAGE.has(e)) return 'image'
  if (PDF.has(e)) return 'pdf'
  if (VIDEO.has(e)) return 'video'
  if (AUDIO.has(e)) return 'audio'
  if (isLinkJsonPath(path)) return 'link'
  if (JSON_EXT.has(e)) return 'json'
  if (TEXT.has(e)) return 'text'
  if (isSpreadsheetExtension(e)) return 'spreadsheet'
  if (isOpenDocumentTextExtension(e)) return 'opendocument'
  return 'binary'
}