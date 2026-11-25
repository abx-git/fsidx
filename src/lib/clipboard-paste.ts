const IMAGE_MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
}

const IMAGE_MIME_PRIORITY = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
] as const

export function uniqueFileNameInScope(desired: string, existingFileNames: ReadonlySet<string>): string {
  if (!existingFileNames.has(desired)) return desired
  const dot = desired.lastIndexOf('.')
  const stem = dot > 0 ? desired.slice(0, dot) : desired
  const ext = dot > 0 ? desired.slice(dot) : ''
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${stem}-${n}${ext}`
    if (!existingFileNames.has(candidate)) return candidate
  }
  return `${stem}-${Date.now()}${ext}`
}

function extensionForImageMime(mime: string): string {
  return IMAGE_MIME_EXT[mime.toLowerCase()] ?? 'png'
}

async function blobFromClipboardItem(item: ClipboardItem, type: string): Promise<Blob> {
  return item.getType(type)
}

type ClipboardScan = {
  image?: { mime: string; blob: Blob }
  plainText?: string
  htmlText?: string
}

async function scanClipboardItems(items: ClipboardItem[]): Promise<ClipboardScan> {
  const scan: ClipboardScan = {}
  for (const item of items) {
    const types = [...item.types]
    for (const mime of IMAGE_MIME_PRIORITY) {
      if (!types.includes(mime) || scan.image) continue
      try {
        const blob = await blobFromClipboardItem(item, mime)
        if (blob.size > 0) scan.image = { mime, blob }
      } catch {
        /* type advertised but unreadable */
      }
    }
    if (!scan.plainText && types.includes('text/plain')) {
      try {
        const blob = await blobFromClipboardItem(item, 'text/plain')
        const text = (await blob.text()).replace(/\r\n/g, '\n')
        if (text.length > 0) scan.plainText = text
      } catch {
        /* ignore */
      }
    }
    if (!scan.htmlText && types.includes('text/html')) {
      try {
        const blob = await blobFromClipboardItem(item, 'text/html')
        const text = await blob.text()
        if (text.trim().length > 0) scan.htmlText = text
      } catch {
        /* ignore */
      }
    }
  }
  return scan
}

function makeFileFromClipboardScan(scan: ClipboardScan, existingFileNames: ReadonlySet<string>): File | null {
  if (scan.image) {
    const ext = extensionForImageMime(scan.image.mime)
    const name = uniqueFileNameInScope(`Bild.${ext}`, existingFileNames)
    return new File([scan.image.blob], name, {
      type: scan.image.mime,
      lastModified: Date.now(),
    })
  }
  if (scan.plainText != null) {
    const name = uniqueFileNameInScope('einfügen.md', existingFileNames)
    return new File([scan.plainText], name, {
      type: 'text/markdown;charset=utf-8',
      lastModified: Date.now(),
    })
  }
  if (scan.htmlText != null) {
    const name = uniqueFileNameInScope('einfügen.html', existingFileNames)
    return new File([scan.htmlText], name, {
      type: 'text/html;charset=utf-8',
      lastModified: Date.now(),
    })
  }
  return null
}

/**
 * Liest die Zwischenablage und erzeugt eine Datei für den aktuellen Scope (Text → .md, Bild → Bilddatei).
 */
export async function readClipboardAsFile(
  existingFileNames: ReadonlySet<string>,
): Promise<File | null> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('Zwischenablage: HTTPS und Browser mit Clipboard-API nötig.')
  }

  if (navigator.clipboard.read) {
    const items = await navigator.clipboard.read()
    if (items.length === 0) return null
    const scan = await scanClipboardItems(items)
    return makeFileFromClipboardScan(scan, existingFileNames)
  }

  if (navigator.clipboard.readText) {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) return null
    const name = uniqueFileNameInScope('einfügen.md', existingFileNames)
    return new File([text], name, {
      type: 'text/markdown;charset=utf-8',
      lastModified: Date.now(),
    })
  }

  throw new Error('Zwischenablage lesen wird in diesem Browser nicht unterstützt.')
}