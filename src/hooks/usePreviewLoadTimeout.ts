import { useEffect, useRef } from 'react'
import { PREVIEW_LOAD_TIMEOUT_MS } from '../lib/preview-load-timeout'

/**
 * Startet einen Timer, solange `active` true ist. Wird `active` false (Laden fertig),
 * wird der Timer gekündigt.
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