import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HOST_MUTATED_MESSAGE,
  HOST_READY_MESSAGE,
  HOST_ROOT_MESSAGE,
  RBASE_MIN_HOST_PROTOCOL_VERSION,
  buildRBaseEmbedUrl,
  parseRBaseHostMessage,
  rbaseEmbedOrigin,
} from '../../lib/r-base/rbase-embed'
import { resolveDirectoryHandleAtPath } from '../../lib/r-base/rbase-handle'
import type { FileSourceStore } from '../../lib/file-sources'

interface RBaseEmbedProps {
  workspaceRoot: string
  fileSources: Extract<FileSourceStore, { kind: 'handles' }>
  locId?: string | null
  className?: string
  onHostMutated?: () => void
}

export function RBaseEmbed({
  workspaceRoot,
  fileSources,
  locId,
  className = '',
  onHostMutated,
}: RBaseEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const readyRef = useRef(false)
  const sentHandleRef = useRef(false)
  const origin = rbaseEmbedOrigin()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const onHostMutatedRef = useRef(onHostMutated)
  onHostMutatedRef.current = onHostMutated

  const sendRoot = useCallback(async () => {
    try {
      const handle = await resolveDirectoryHandleAtPath(fileSources.root, workspaceRoot)
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: HOST_ROOT_MESSAGE,
          rootHandle: handle,
          locId: locId ?? null,
          hostProtocol: RBASE_MIN_HOST_PROTOCOL_VERSION,
        },
        origin,
      )
      sentHandleRef.current = true
      setStatus('ready')
      setError(null)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Workspace-Handle konnte nicht übergeben werden.')
    }
  }, [fileSources.root, workspaceRoot, locId, origin])

  useEffect(() => {
    readyRef.current = false
    sentHandleRef.current = false
    setStatus('loading')
    setError(null)
  }, [workspaceRoot, locId])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return
      const msg = parseRBaseHostMessage(event.data)
      if (!msg?.type) return
      if (msg.type === HOST_READY_MESSAGE) {
        const protocol =
          typeof msg.hostProtocol === 'number' ? msg.hostProtocol : 0
        if (protocol < RBASE_MIN_HOST_PROTOCOL_VERSION) {
          setStatus('error')
          setError(`R-Base-Host-Protokoll zu alt (${protocol}).`)
          return
        }
        readyRef.current = true
        void sendRoot()
        return
      }
      if (msg.type === HOST_MUTATED_MESSAGE) {
        onHostMutatedRef.current?.()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [origin, sendRoot])

  const embedUrl = buildRBaseEmbedUrl(locId)

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      {status === 'error' && error && (
        <p className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}
      {status === 'loading' && !error && (
        <p className="shrink-0 border-b border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          R-Base wird geladen…
        </p>
      )}
      <iframe
        ref={iframeRef}
        title="R-Base Workspace"
        src={embedUrl}
        className="min-h-0 w-full flex-1 border-0 bg-white dark:bg-zinc-950"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}