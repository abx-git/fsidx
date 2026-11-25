import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EMBED_DOCUMENT_MESSAGE,
  EMBED_LOAD_MESSAGE,
  EMBED_READY_MESSAGE,
  EMBED_REQUEST_SAVE_MESSAGE,
  EMBED_SAVE_ACK_MESSAGE,
  buildE2EmbedUrl,
  e2EmbedOrigin,
  parseE2EmbedMessage,
} from '../../lib/e2/e2-embed'
import { E2_MIN_HOST_PROTOCOL_VERSION } from '../../lib/e2/e2-schema-constants'
import { isE2BoardSnapshotText } from '../../lib/e2/e2-board-paths'

const FLUSH_TIMEOUT_MS = 2500

interface E2EmbedProps {
  hostFileId: string
  json: string
  canWrite: boolean
  className?: string
  onJsonChange?: (json: string, hostFileId: string, reason: 'autosave' | 'flush') => void
}

export function E2Embed({ hostFileId, json, canWrite, className = '', onJsonChange }: E2EmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const jsonRef = useRef(json)
  const hostFileIdRef = useRef(hostFileId)
  const readyRef = useRef(false)
  const origin = e2EmbedOrigin()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const flushWaiterRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    jsonRef.current = json
  }, [json])

  useEffect(() => {
    hostFileIdRef.current = hostFileId
  }, [hostFileId])

  useEffect(() => {
    readyRef.current = false
    if (!json.trim()) {
      setStatus('error')
      setError('Leere Board-Datei.')
      return
    }
    if (!isE2BoardSnapshotText(json)) {
      setStatus('error')
      setError('Kein gültiges E2-Board (`.e2.json` v1/v2).')
      return
    }
    setStatus('loading')
    setError(null)
  }, [json, hostFileId])

  const postToIframe = useCallback(
    (payload: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(payload, origin)
    },
    [origin],
  )

  const sendLoad = useCallback(() => {
    postToIframe({
      type: EMBED_LOAD_MESSAGE,
      json: jsonRef.current,
      hostFileId: hostFileIdRef.current,
      editable: canWrite,
      autosave: canWrite,
    })
  }, [canWrite, postToIframe])

  const requestFlushThen = useCallback(
    (next: () => void) => {
      if (!canWrite || !readyRef.current) {
        next()
        return
      }
      const expectedId = hostFileIdRef.current
      let done = false
      const finish = () => {
        if (done) return
        done = true
        flushWaiterRef.current = null
        next()
      }
      flushWaiterRef.current = finish
      postToIframe({ type: EMBED_REQUEST_SAVE_MESSAGE, hostFileId: expectedId })
      window.setTimeout(finish, FLUSH_TIMEOUT_MS)
    },
    [canWrite, postToIframe],
  )

  useEffect(() => {
    if (status === 'error') return

    const onMessage = (evt: MessageEvent) => {
      if (evt.origin !== origin) return
      if (evt.source !== iframeRef.current?.contentWindow) return
      const msg = parseE2EmbedMessage(evt.data)
      if (!msg?.type) return

      if (msg.type === EMBED_READY_MESSAGE) {
        const protocol = typeof msg.hostProtocol === 'number' ? msg.hostProtocol : 0
        if (protocol > 0 && protocol < E2_MIN_HOST_PROTOCOL_VERSION) {
          setStatus('error')
          setError(
            `E2-Embed zu alt (Protokoll ${protocol}). Bitte E2 ≥ Host-Protokoll ${E2_MIN_HOST_PROTOCOL_VERSION} deployen.`,
          )
          return
        }
        readyRef.current = true
        setStatus('ready')
        sendLoad()
        return
      }

      if (msg.type === EMBED_DOCUMENT_MESSAGE) {
        const doc = msg as {
          json?: string
          hostFileId?: string
          reason?: 'autosave' | 'flush'
        }
        if (typeof doc.json !== 'string' || typeof doc.hostFileId !== 'string') return
        onJsonChange?.(doc.json, doc.hostFileId, doc.reason ?? 'autosave')
        if (doc.reason === 'flush' && flushWaiterRef.current) {
          flushWaiterRef.current()
        }
        if (doc.hostFileId === hostFileIdRef.current) {
          postToIframe({
            type: EMBED_SAVE_ACK_MESSAGE,
            hostFileId: doc.hostFileId,
            ok: true,
          })
        }
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [status, origin, onJsonChange, postToIframe, sendLoad])

  const prevHostRef = useRef(hostFileId)
  useEffect(() => {
    if (prevHostRef.current === hostFileId) return
    const previous = prevHostRef.current
    prevHostRef.current = hostFileId
    if (!readyRef.current) return
    requestFlushThen(() => {
      if (previous !== hostFileIdRef.current) sendLoad()
    })
  }, [hostFileId, requestFlushThen, sendLoad])

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
        <p className="absolute inset-x-0 top-2 z-10 text-center text-xs text-zinc-500">E2-Board wird geladen…</p>
      )}
      <iframe
        ref={iframeRef}
        src={buildE2EmbedUrl(canWrite)}
        title="E2 Domänenmodell"
        className="h-full min-h-[320px] w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}