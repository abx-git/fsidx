import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { TextareaEditResult } from '../../lib/markdown-textarea-edit'
import { MarkdownBlockToolbar } from './MarkdownBlockToolbar'

interface MarkdownTextareaWithToolbarProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  minHeightClass?: string
  /** Toolbar bleibt beim Scrollen sichtbar (Vollbild-Editor). */
  stickyToolbar?: boolean
  /** Einmal Caret setzen (z. B. nach Doppelklick in der Vorschau). */
  focusAt?: number | null
  onFocusAtApplied?: () => void
}

export function MarkdownTextareaWithToolbar({
  value,
  onChange,
  disabled = false,
  placeholder,
  className = '',
  minHeightClass = 'min-h-[7.5rem]',
  stickyToolbar = false,
  focusAt = null,
  onFocusAtApplied,
}: MarkdownTextareaWithToolbarProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const pendingSelection = useRef<TextareaEditResult | null>(null)
  const [textareaEl, setTextareaEl] = useState<HTMLTextAreaElement | null>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`
  }, [])

  useLayoutEffect(() => {
    resize()
  }, [value, resize])

  useLayoutEffect(() => {
    if (!pendingSelection.current || !ref.current) return
    const pending = pendingSelection.current
    pendingSelection.current = null
    ref.current.focus()
    ref.current.setSelectionRange(pending.selectionStart, pending.selectionEnd)
    resize()
  }, [value, resize])

  useLayoutEffect(() => {
    if (focusAt == null || !ref.current) return
    const el = ref.current
    const pos = Math.min(Math.max(0, focusAt), el.value.length)
    el.focus()
    el.setSelectionRange(pos, pos)
    const style = window.getComputedStyle(el)
    const lineHeight = Number.parseFloat(style.lineHeight) || 20
    const linesAbove = el.value.slice(0, pos).split('\n').length
    el.scrollTop = Math.max(0, (linesAbove - 4) * lineHeight)
    resize()
    onFocusAtApplied?.()
  }, [focusAt, onFocusAtApplied, resize])

  const applyEdit = (result: TextareaEditResult) => {
    pendingSelection.current = result
    onChange(result.value)
  }

  const toolbar =
    !disabled ? (
      <MarkdownBlockToolbar
        textarea={textareaEl}
        onApply={applyEdit}
        disabled={disabled}
        className={stickyToolbar ? 'sticky top-0 z-20 shrink-0' : undefined}
      />
    ) : null

  const textarea = (
    <textarea
      ref={(el) => {
        ref.current = el
        setTextareaEl(el)
      }}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value)
        resize()
      }}
      placeholder={placeholder}
      spellCheck
      className={`w-full border-0 bg-white px-3 py-2 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-inset focus:ring-violet-500/25 disabled:opacity-60 dark:bg-zinc-950 dark:text-zinc-100 ${
        stickyToolbar ? 'min-h-[min(60vh,480px)] resize-none' : `resize-y ${minHeightClass}`
      } ${className}`}
    />
  )

  if (stickyToolbar) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {toolbar}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-b-lg border border-t-0 border-zinc-300 dark:border-zinc-600">
          {textarea}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-600">
      {toolbar}
      {textarea}
    </div>
  )
}