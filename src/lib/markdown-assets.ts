const WIKI_IMG_PREFIX = 'fsidx-wiki:'

const IMAGE_EXT =
  /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i

export function isProbablyImagePath(ref: string): boolean {
  const clean = ref.split('?')[0].split('#')[0]
  return IMAGE_EXT.test(clean)
}

export function joinRelativePath(baseDir: string, ref: string): string {
  const norm = ref.replace(/\\/g, '/').trim()
  if (!norm || /^[a-z][a-z0-9+.-]*:/i.test(norm) || norm.startsWith('data:')) return norm
  if (norm.startsWith('/')) return norm.slice(1)

  const stack = baseDir ? baseDir.split('/').filter(Boolean) : []
  for (const part of norm.split('/')) {
    if (part === '.' || part === '') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  return stack.join('/')
}

/** Ordner der Datei (z. B. `a/b/note.md` → `a/b`). */
export function docDirectory(docPath: string): string {
  const norm = docPath.replace(/\\/g, '/')
  if (!norm) return ''
  const idx = norm.lastIndexOf('/')
  return idx === -1 ? '' : norm.slice(0, idx)
}

function decodeAssetRef(src: string): string {
  const trimmed = src.trim()
  if (trimmed.startsWith(WIKI_IMG_PREFIX)) {
    try {
      return decodeURIComponent(trimmed.slice(WIKI_IMG_PREFIX.length))
    } catch {
      return trimmed.slice(WIKI_IMG_PREFIX.length)
    }
  }
  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}

/** Nur Dateiname ohne Verzeichnis (z. B. `foto.png`). */
export function isBareAssetName(ref: string): boolean {
  const clean = decodeAssetRef(ref).replace(/^\.\/+/, '')
  return clean.length > 0 && !clean.includes('/')
}

/**
 * Liefert Index-Pfade zum Laden eines Assets.
 * Ohne Verzeichnis im Link → Datei im gleichen Ordner wie `docPath`.
 * Mit `./`, `../` oder Unterordner → relativ zum MD-Ordner.
 * Führendes `/` → ab Workspace-Root.
 */
export function resolveAssetPathCandidates(docPath: string, src: string): string[] {
  const raw = decodeAssetRef(src)
  if (!raw) return []

  if (/^(https?:|data:|blob:)/i.test(raw)) return [raw]

  if (raw.startsWith('/') || raw.startsWith('\\')) {
    return [raw.replace(/^[/\\]+/, '').replace(/\\/g, '/')]
  }

  const baseDir = docDirectory(docPath)
  return [joinRelativePath(baseDir, raw)]
}

export function resolveAssetPath(docPath: string, src: string): string {
  return resolveAssetPathCandidates(docPath, src)[0] ?? src
}

/** Obsidian `![[path|alt]]` → Markdown mit internem Bildschema. */
export function preprocessObsidianEmbeds(content: string): string {
  let out = content.replace(/!\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/g, (_, path, alt) => {
    let p = String(path).trim()
    if (p && !p.includes('/') && !p.startsWith('./') && !p.startsWith('../')) {
      p = `./${p}`
    }
    const label = (alt ?? p.split('/').pop() ?? 'image').trim()
    return `![${label}](${WIKI_IMG_PREFIX}${encodeURIComponent(p)})`
  })

  out = out.replace(/(^|[^\!])\[\[([^\]|#]+)\]\](?!\()/g, (match, before, path) => {
    const p = String(path).trim()
    if (isProbablyImagePath(p)) {
      const label = p.split('/').pop() ?? 'image'
      return `${before}![${label}](${WIKI_IMG_PREFIX}${encodeURIComponent(p)})`
    }
    return match
  })

  return out
}