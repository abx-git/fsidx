import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'

interface MarkdownInlineBlockFieldProps {
  sessionId: string
  value: string
  onChange: (value: string) => void
  onEnterSplit: (cursor: number) => void
  onDismiss: () => void
  disabled?: boolean
  className?: string
  variant?: 'prose' | 'code'
  autoFocus?: boolean
  focusAtStart?: boolean
  onAutoFocusApplied?: () => void
  onNavigatePrev?: () => void
  onNavigateNext?: () => void
  onUndo?: () => void
  onRedo?: () => void
}

function MarkdownInlineBlockFieldInner({
  sessionId,
  value,
  onChange,
  onEnterSplit,
  onDismiss,
  disabled = false,
  className,
  variant = 'prose',
  autoFocus = false,
  focusAtStart = false,
  onAutoFocusApplied,
  onNavigatePrev,
  onNavigateNext,
  onUndo,
  onRedo,
}: MarkdownInlineBlockFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [sessionId])

  const syncHeight = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useLayoutEffect(() => {
    syncHeight()
  }, [localValue])

  useLayoutEffect(() => {
    if (!autoFocus || !ref.current) return
    ref.current.focus()
    const pos = focusAtStart ? 0 : ref.current.value.length
    ref.current.setSelectionRange(pos, pos)
    onAutoFocusApplied?.()
  }, [autoFocus, focusAtStart, onAutoFocusApplied])

  useEffect(() => {
    if (!autoFocus) return
    syncHeight()
  }, [autoFocus])

  const ghost = variant === 'prose'

  return (
    <textarea
      ref={ref}
      value={localValue}
      disabled={disabled}
      rows={1}
      onChange={(e) => {
        const next = e.target.value
        setLocalValue(next)
        syncHeight()
        onChange(next)
      }}
      onKeyDown={(e) => {
        const mod = e.ctrlKey || e.metaKey
        if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
          if (onUndo) {
            e.preventDefault()
            onUndo()
          }
          return
        }
        if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
          if (onRedo) {
            e.preventDefault()
            onRedo()
          }
          return
        }
        const pos = ref.current?.selectionStart ?? 0
        const end = ref.current?.selectionEnd ?? pos
        const atStart = pos === 0 && end === 0
        const atEnd = pos === localValue.length && end === localValue.length
        if (e.key === 'ArrowUp' && atStart) {
          if (onNavigatePrev) {
            e.preventDefault()
            onNavigatePrev()
          }
          return
        }
        if (e.key === 'ArrowDown' && atEnd) {
          if (onNavigateNext) {
            e.preventDefault()
            onNavigateNext()
          }
          return
        }
        if (e.key === 'ArrowLeft' && atStart && onNavigatePrev) {
          e.preventDefault()
          onNavigatePrev()
          return
        }
        if (e.key === 'ArrowRight' && atEnd && onNavigateNext) {
          e.preventDefault()
          onNavigateNext()
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          onDismiss()
          return
        }
        if (e.key === 'Enter' && e.shiftKey) {
          return
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          const cursor = ref.current?.selectionStart ?? localValue.length
          onEnterSplit(cursor)
          return
        }
      }}
      spellCheck
      className={[
        ghost ? 'md-inline-ghost-field' : 'md-inline-code-field',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Block bearbeiten"
    />
  )
}

export const MarkdownInlineBlockField = memo(
  MarkdownInlineBlockFieldInner,
  (prev, next) =>
    prev.sessionId === next.sessionId
    && prev.disabled === next.disabled
    && prev.autoFocus === next.autoFocus
    && prev.focusAtStart === next.focusAtStart
    && prev.variant === next.variant
    && prev.className === next.className,
  // navigation/undo callbacks intentionally ignored (stable via editor)
)