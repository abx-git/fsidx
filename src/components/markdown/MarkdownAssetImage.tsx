import { useEffect, useState } from 'react'
import { readBlobFromStore, type FileSourceStore } from '../../lib/file-sources'
import { resolveAssetPath, resolveAssetPathCandidates } from '../../lib/markdown-assets'

interface MarkdownAssetImageProps {
  src?: string
  alt?: string
  title?: string
  docPath: string
  fileSources: FileSourceStore | null
  className?: string
}

export function MarkdownAssetImage({
  src,
  alt,
  title,
  docPath,
  fileSources,
  className,
}: MarkdownAssetImageProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!src || !fileSources) {
      setUrl(null)
      setFailed(!src)
      return
    }

    let revoked: string | null = null
    let cancelled = false

    const candidates = resolveAssetPathCandidates(docPath, src)

    void (async () => {
      for (const resolved of candidates) {
        if (/^(https?:|data:|blob:)/i.test(resolved)) continue
        try {
          const blob = await readBlobFromStore(fileSources, resolved)
          const objectUrl = URL.createObjectURL(blob)
          revoked = objectUrl
          if (!cancelled) {
            setUrl(objectUrl)
            setFailed(false)
          } else URL.revokeObjectURL(objectUrl)
          return
        } catch {
          /* nächster Kandidat */
        }
      }
      if (!cancelled) {
        setUrl(null)
        setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [src, docPath, fileSources])

  if (!src) return null

  if (url) {
    const lower = src.toLowerCase()
    const isSvg = lower.endsWith('.svg') || lower.includes('svg')
    return (
      <img
        src={url}
        alt={alt ?? ''}
        title={title}
        className={isSvg ? `diagram-svg-img max-w-full ${className ?? ''}` : className}
        loading="lazy"
      />
    )
  }

  if (failed) {
    return (
      <span
        className="inline-flex max-w-full items-center gap-1 rounded border border-dashed border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900"
        title={resolveAssetPath(docPath, src)}
      >
        Bild nicht gefunden: {alt || src}
      </span>
    )
  }

  return (
    <span className="inline-block h-8 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" aria-hidden />
  )
}