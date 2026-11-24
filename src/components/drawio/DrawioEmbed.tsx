import { useCallback, useEffect, useRef, useState } from 'react'
import { isDrawioSource } from '../../lib/drawio'
import {
  drawioOriginForMode,
  drawioUrlForMode,
  parseDrawioMessage,
} from '../../lib/drawio/drawio-embed'

interface DrawioEmbedProps {
  xml: string
  mode: 'viewer' | 'editor'
  className?: string
  /** Nur Editor: autosave/save an Host */
  onXmlChange?: (xml: string) => void
  readOnly?: boolean
}

export function DrawioEmbed({ xml, mode, className = '', onXmlChange, readOnly = false }: DrawioEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const xmlRef = useRef(xml)
  const loadedRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const origin = drawioOriginForMode(mode)

  useEffect(() => {
    xmlRef.current = xml
    loadedRef.current = false
    if (!isDrawioSource(xml) && mode === 'viewer') {
      setStatus('error')
      setError('Kein gültiges draw.io-XML.')
      return
    }
    setStatus('loading')
    setError(null)
  }, [xml, mode])

  const postLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        action: 'load',
        xml: xmlRef.current,
        autosave: mode === 'editor' && !readOnly ? 1 : 0,
      }),
      '*',
    )
  }, [mode, readOnly])

  useEffect(() => {
    if (status === 'error') return

    const onMessage = (evt: MessageEvent) => {
      if (evt.origin !== origin) return
      if (evt.source !== iframeRef.current?.contentWindow) return
      const msg = parseDrawioMessage(evt.data)
      if (!msg?.event) return

      if (msg.event === 'init') {
        postLoad()
        loadedRef.current = true
        setStatus('ready')
      }
      if (msg.event === 'load') {
        setStatus('ready')
      }
      if (mode === 'editor' && !readOnly && (msg.event === 'save' || msg.event === 'autosave') && msg.xml) {
        onXmlChange?.(msg.xml)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [status, origin, mode, readOnly, onXmlChange, postLoad])

  useEffect(() => {
    if (!loadedRef.current || status !== 'ready') return
    postLoad()
  }, [xml, postLoad, status])

  if (status === 'error' || error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </p>
    )
  }

  return (
    <div className={`relative min-h-0 flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-900 ${className}`}>
      {status === 'loading' && (
        <p className="absolute inset-x-0 top-2 z-10 text-center text-xs text-zinc-500">draw.io wird geladen…</p>
      )}
      <iframe
        ref={iframeRef}
        src={drawioUrlForMode(mode)}
        title={mode === 'editor' ? 'draw.io Editor' : 'draw.io Vorschau'}
        className="h-full min-h-[320px] w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}