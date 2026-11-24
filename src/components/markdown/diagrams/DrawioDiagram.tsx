import { useEffect, useRef, useState } from 'react'
import { isDrawioSource } from '../../../lib/drawio'

const VIEWER_ORIGIN = 'https://viewer.diagrams.net'
const VIEWER_URL = `${VIEWER_ORIGIN}/?embed=1&ui=min&spin=0&proto=json&nav=1&toolbar=0`

interface DrawioDiagramProps {
  source: string
  className?: string
}

export function DrawioDiagram({ source, className = '' }: DrawioDiagramProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isDrawioSource(source)) {
      setStatus('error')
      setError('Kein gültiges draw.io-XML (mxfile / mxGraphModel).')
      return
    }
    setStatus('loading')
    setError(null)
  }, [source])

  useEffect(() => {
    if (status === 'error') return

    const onMessage = (evt: MessageEvent) => {
      if (evt.origin !== VIEWER_ORIGIN) return
      if (evt.source !== iframeRef.current?.contentWindow) return
      let msg: { event?: string }
      try {
        msg = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data
      } catch {
        return
      }
      if (msg?.event === 'init') {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'load', xml: source, autosave: 0 }),
          '*',
        )
        setStatus('ready')
      }
      if (msg?.event === 'load') {
        setStatus('ready')
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [source, status])

  if (status === 'error' || error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </p>
    )
  }

  return (
    <div
      className={`diagram-drawio relative min-h-[min(70vh,720px)] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
    >
      {status === 'loading' && (
        <p className="absolute inset-x-0 top-2 z-10 text-center text-xs text-zinc-500">
          draw.io wird geladen…
        </p>
      )}
      <iframe
        ref={iframeRef}
        src={VIEWER_URL}
        title="draw.io Diagramm"
        className="h-[min(70vh,720px)] w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}