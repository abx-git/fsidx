import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { TextareaEditResult } from '../../lib/markdown-textarea-edit'
import { scrollTextareaToLine } from '../../lib/markdown-view-click'

const SCROLL_ANCHOR_PX = 96
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
  focusRange?: { start: number; end: number; line?: number } | null
  onFocusRangeApplied?: () => void
  onEscapeAt?: (caret: number) => void
  scrollToLine?: number | null
  onScrollToLineApplied?: () => void
}

export function MarkdownTextareaWithToolbar({
  value,
  onChange,
  disabled = false,
  placeholder,
  className = '',
  minHeightClass = 'min-h-[7.5rem]',
  stickyToolbar = false,
  focusRange = null,
  onFocusRangeApplied,
  onEscapeAt,
  scrollToLine = null,
  onScrollToLineApplied,
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
    if (!focusRange || !ref.current) return
    const el = ref.current
    const start = Math.min(Math.max(0, focusRange.start), el.value.length)
    const end = Math.min(Math.max(start, focusRange.end), el.value.length)
    el.focus()
    el.setSelectionRange(start, end)
    const line =
      focusRange.line ??
      el.value.slice(0, start).split('\n').length
    scrollTextareaToLine(el, line, SCROLL_ANCHOR_PX)
    resize()
    onFocusRangeApplied?.()
  }, [focusRange, onFocusRangeApplied, resize])

  useLayoutEffect(() => {
    if (scrollToLine == null || !ref.current) return
    scrollTextareaToLine(ref.current, scrollToLine, SCROLL_ANCHOR_PX)
    onScrollToLineApplied?.()
  }, [scrollToLine, onScrollToLineApplied])

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
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onEscapeAt && ref.current) {
          e.preventDefault()
          onEscapeAt(ref.current.selectionStart)
        }
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