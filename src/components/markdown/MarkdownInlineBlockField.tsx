import { useEffect, useLayoutEffect, useRef } from 'react'

interface MarkdownInlineBlockFieldProps {
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

export function MarkdownInlineBlockField({
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
  const pendingSelection = useRef<{ start: number; end: number } | null>(null)

  useLayoutEffect(() => {
    if (!autoFocus || !ref.current) return
    ref.current.focus()
    const pos = focusAtStart ? 0 : ref.current.value.length
    ref.current.setSelectionRange(pos, pos)
    onAutoFocusApplied?.()
  }, [autoFocus, focusAtStart, onAutoFocusApplied])

  useEffect(() => {
    if (!pendingSelection.current || !ref.current) return
    const { start, end } = pendingSelection.current
    pendingSelection.current = null
    ref.current.focus()
    ref.current.setSelectionRange(start, end)
  }, [value])

  const syncHeight = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useLayoutEffect(() => {
    syncHeight()
  }, [value])

  const ghost = variant === 'prose'

  return (
    <textarea
      ref={ref}
      value={value}
      disabled={disabled}
      rows={1}
      onChange={(e) => {
        onChange(e.target.value)
        syncHeight()
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
          const cursor = ref.current?.selectionStart ?? value.length
          pendingSelection.current = null
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