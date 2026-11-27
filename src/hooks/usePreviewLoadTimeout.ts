import { useEffect, useRef } from 'react'
import { PREVIEW_LOAD_TIMEOUT_MS } from '../lib/preview-load-timeout'

/**
 * Startet einen Timer, solange `active` true ist (nur einfache Vorschauen in {@link ViewerShell}).
 * Schließt den Viewer — **nicht** für Markdown-Editor verwenden.
 */
export function usePreviewLoadTimeout(
  active: boolean,
  onTimeout: () => void,
  timeoutMs: number = PREVIEW_LOAD_TIMEOUT_MS,
): void {
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    if (!active) return
    const id = window.setTimeout(() => onTimeoutRef.current(), timeoutMs)
    return () => clearTimeout(id)
  }, [active, timeoutMs])
}