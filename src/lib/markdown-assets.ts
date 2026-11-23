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

export function resolveAssetPath(docPath: string, src: string): string {
  const decoded = src.startsWith(WIKI_IMG_PREFIX)
    ? decodeURIComponent(src.slice(WIKI_IMG_PREFIX.length))
    : src
  if (decoded.startsWith(WIKI_IMG_PREFIX)) {
    return joinRelativePath(
      docPath.includes('/') ? docPath.slice(0, docPath.lastIndexOf('/')) : '',
      decodeURIComponent(decoded.slice(WIKI_IMG_PREFIX.length)),
    )
  }
  const baseDir = docPath.includes('/') ? docPath.slice(0, docPath.lastIndexOf('/')) : ''
  return joinRelativePath(baseDir, decoded)
}

/** Obsidian `![[path|alt]]` → Markdown mit internem Bildschema. */
export function preprocessObsidianEmbeds(content: string): string {
  let out = content.replace(/!\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/g, (_, path, alt) => {
    const p = String(path).trim()
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