export const DRAWIO_VIEWER_ORIGIN = 'https://viewer.diagrams.net'
export const DRAWIO_EMBED_ORIGIN = 'https://embed.diagrams.net'

/** Chromeless read-only (ohne diagrams.net-Toolbar/Navigation). */
export const DRAWIO_VIEWER_URL = [
  `${DRAWIO_VIEWER_ORIGIN}/?`,
  [
    'embed=1',
    'proto=json',
    'chrome=0',
    'toolbar=0',
    'nav=0',
    'hide-pages=1',
    'close=0',
    'noExport=1',
    'noPrint=1',
    'lightbox=1',
    'ui=min',
    'spin=0',
  ].join('&'),
].join('')
export const DRAWIO_EDITOR_URL = `${DRAWIO_EMBED_ORIGIN}/?embed=1&ui=atlas&spin=1&modified=since&proto=json&saveAndExit=0&noSaveBtn=1&nav=1`

export type DrawioEmbedMessage = {
  event?: string
  xml?: string
  message?: string
}

export function parseDrawioMessage(data: unknown): DrawioEmbedMessage | null {
  try {
    return typeof data === 'string' ? (JSON.parse(data) as DrawioEmbedMessage) : (data as DrawioEmbedMessage)
  } catch {
    return null
  }
}

export function drawioOriginForMode(mode: 'viewer' | 'editor'): string {
  return mode === 'editor' ? DRAWIO_EMBED_ORIGIN : DRAWIO_VIEWER_ORIGIN
}

export function drawioUrlForMode(mode: 'viewer' | 'editor'): string {
  return mode === 'editor' ? DRAWIO_EDITOR_URL : DRAWIO_VIEWER_URL
}