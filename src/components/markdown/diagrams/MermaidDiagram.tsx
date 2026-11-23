import { useEffect, useId, useState } from 'react'
import { Loader2 } from 'lucide-react'

let mermaidApi: typeof import('mermaid')['default'] | null = null

async function getMermaid() {
  if (mermaidApi) return mermaidApi
  const mod = await import('mermaid')
  mermaidApi = mod.default
  mermaidApi.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'strict',
    suppressErrorRendering: false,
  })
  return mermaidApi
}

interface MermaidDiagramProps {
  source: string
  className?: string
}

export function MermaidDiagram({ source, className = '' }: MermaidDiagramProps) {
  const baseId = useId().replace(/:/g, '')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSvg(null)
    setError(null)
    const renderId = `mermaid-${baseId}-${Math.random().toString(36).slice(2, 9)}`
    void getMermaid().then((mermaid) =>
      mermaid
      .render(renderId, source.trim())
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Mermaid konnte nicht gerendert werden')
        }
      }),
    )
    return () => {
      cancelled = true
    }
  }, [source, baseId])

  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 ${className}`}
      >
        {error}
      </div>
    )
  }

  if (!svg) {
    return (
      <p className={`flex items-center gap-2 text-xs text-zinc-500 ${className}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Diagramm wird gerendert…
      </p>
    )
  }

  return (
    <div
      className={`diagram-mermaid overflow-x-auto rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}