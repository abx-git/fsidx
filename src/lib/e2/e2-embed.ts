export const E2_EMBED_ORIGIN =
  (import.meta.env.VITE_E2_EMBED_ORIGIN as string | undefined)?.replace(/\/$/, '') ??
  'https://abx-git.github.io/E2'

export const EMBED_READY_MESSAGE = 'e2/embed-ready'
export const EMBED_LOAD_MESSAGE = 'e2/embed-load'
export const EMBED_DOCUMENT_MESSAGE = 'e2/embed-document'
export const EMBED_REQUEST_SAVE_MESSAGE = 'e2/embed-request-save'
export const EMBED_SAVE_ACK_MESSAGE = 'e2/embed-save-ack'

export type E2EmbedLoadMessage = {
  type: typeof EMBED_LOAD_MESSAGE
  json: string
  hostFileId: string
  editable?: boolean
  autosave?: boolean
}

export type E2EmbedDocumentMessage = {
  type: typeof EMBED_DOCUMENT_MESSAGE
  json: string
  hostFileId: string
  revision: number
  reason: 'autosave' | 'flush'
}

export type E2EmbedReadyMessage = {
  type: typeof EMBED_READY_MESSAGE
  hostProtocol?: number
}

export function e2EmbedOrigin(): string {
  try {
    return new URL(E2_EMBED_ORIGIN).origin
  } catch {
    return E2_EMBED_ORIGIN
  }
}

/** Bump when fsidx needs a newer E2 /embed UI (iframe cache bust). */
const E2_EMBED_UI_REV = '3'

export function buildE2EmbedUrl(canWrite: boolean): string {
  const params = new URLSearchParams({
    embed: '1',
    boardAutoLoad: '0',
    editable: canWrite ? '1' : '0',
    hostUi: E2_EMBED_UI_REV,
  })
  if (typeof window !== 'undefined') {
    params.set('parentOrigin', window.location.origin)
  }
  return `${E2_EMBED_ORIGIN}/embed/?${params.toString()}`
}

export function parseE2EmbedMessage(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  return data as Record<string, unknown>
}