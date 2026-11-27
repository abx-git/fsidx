/**
 * Maximale Wartezeit bis eine **eingebettete Dateivorschau** (Bild, PDF, …) Inhalt zeigen muss.
 * Markdown-Editor nutzt keinen künstlichen Abbruch — dort bleibt der Editor offen.
 */
export const PREVIEW_LOAD_TIMEOUT_MS = 30_000

export const PREVIEW_LOAD_TIMEOUT_MESSAGE =
  'Vorschau abgebrochen: Laden hat zu lange gedauert.'