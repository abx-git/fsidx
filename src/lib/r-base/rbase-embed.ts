export const RBASE_EMBED_ORIGIN =
  (import.meta.env.VITE_RBASE_EMBED_ORIGIN as string | undefined)?.replace(/\/$/, '') ??
  'https://abx-git.github.io/r-base'

export const HOST_ROOT_MESSAGE = 'r-base/host-root'
export const HOST_READY_MESSAGE = 'r-base/host-ready'
export const HOST_MUTATED_MESSAGE = 'r-base/host-mutated'

export const RBASE_MIN_HOST_PROTOCOL_VERSION = 1

/** Bump when fsidx needs newer r-base /embed UI. */
const RBASE_EMBED_UI_REV = '1'

export function rbaseEmbedOrigin(): string {
  try {
    return new URL(RBASE_EMBED_ORIGIN).origin
  } catch {
    return RBASE_EMBED_ORIGIN
  }
}

export function buildRBaseEmbedUrl(locId?: string | null): string {
  const params = new URLSearchParams({
    embed: '1',
    hostUi: RBASE_EMBED_UI_REV,
  })
  if (typeof window !== 'undefined') {
    params.set('parentOrigin', window.location.origin)
  }
  if (locId?.trim()) params.set('locId', locId.trim())
  const base = RBASE_EMBED_ORIGIN.endsWith('/') ? RBASE_EMBED_ORIGIN : `${RBASE_EMBED_ORIGIN}/`
  return `${base}embed.html?${params.toString()}`
}

export function parseRBaseHostMessage(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  return data as Record<string, unknown>
}