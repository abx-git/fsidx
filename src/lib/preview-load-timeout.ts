/**
 * Maximale Wartezeit bis eine **eingebettete Dateivorschau** (Bild, PDF, …) Inhalt zeigen muss.
 * Markdown-Editor: kein Lese-Timeout (`MARKDOWN_DISABLE_LOAD_TIMEOUT`).
 */
export const PREVIEW_LOAD_TIMEOUT_MS = 30_000

/** Markdown (Hook `useMarkdownDocument`) wartet ohne Abbruch auf die Platte. */
export const MARKDOWN_DISABLE_LOAD_TIMEOUT = true

export const PREVIEW_LOAD_TIMEOUT_MESSAGE =
  'Vorschau abgebrochen: Laden hat zu lange gedauert.'