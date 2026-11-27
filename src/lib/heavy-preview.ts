import type { FileViewerKind } from './file-viewers'

/** Ab dieser Index-Größe erscheint eine Bestätigung vor speicherintensiver Vorschau. */
export const HEAVY_PREVIEW_WARN_BYTES = 5 * 1024 * 1024

const HEAVY_VIEWERS = new Set<FileViewerKind>([
  'spreadsheet',
  'opendocument',
  'pdf',
  'image',
  'video',
  'audio',
  'binary',
])

export function isHeavyPreviewViewer(kind: FileViewerKind): boolean {
  return HEAVY_VIEWERS.has(kind)
}

export function shouldConfirmHeavyPreview(
  kind: FileViewerKind,
  sizeBytes: number | undefined,
): sizeBytes is number {
  if (!isHeavyPreviewViewer(kind)) return false
  if (sizeBytes == null || !Number.isFinite(sizeBytes)) return false
  return sizeBytes >= HEAVY_PREVIEW_WARN_BYTES
}