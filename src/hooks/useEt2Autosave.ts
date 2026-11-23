import { useEffect, useRef } from 'react'

/** Debounced background save with serialized writes (no UI reload). */
export function useEt2Autosave(options: {
  enabled: boolean
  dirty: boolean
  loading: boolean
  save: () => Promise<void>
  debounceMs?: number
  /** Fields that should retrigger debounce when edited. */
  watch: unknown[]
}) {
  const { enabled, dirty, loading, save, debounceMs = 400, watch } = options
  const saveRef = useRef(save)
  const inFlightRef = useRef(false)
  const queuedRef = useRef(false)

  saveRef.current = save

  const flush = async () => {
    if (inFlightRef.current) {
      queuedRef.current = true
      return
    }
    inFlightRef.current = true
    try {
      do {
        queuedRef.current = false
        await saveRef.current()
      } while (queuedRef.current)
    } finally {
      inFlightRef.current = false
    }
  }

  useEffect(() => {
    if (!enabled || !dirty || loading) return
    const timer = window.setTimeout(() => {
      void flush()
    }, debounceMs)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watch spreads edit fields
  }, [enabled, dirty, loading, debounceMs, ...watch])
}