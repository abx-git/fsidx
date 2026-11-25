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
)