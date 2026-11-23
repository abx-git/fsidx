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
}

export function MarkdownTextareaWithToolbar({
  value,
  onChange,
  disabled = false,
  placeholder,
  className = '',
  minHeightClass = 'min-h-[7.5rem]',
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

  const applyEdit = (result: TextareaEditResult) => {
    pendingSelection.current = result
    onChange(result.value)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-600">
      {!disabled && (
        <MarkdownBlockToolbar textarea={textareaEl} onApply={applyEdit} disabled={disabled} />
      )}
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
        className={`w-full resize-y border-0 bg-white px-3 py-2 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-inset focus:ring-violet-500/25 disabled:opacity-60 dark:bg-zinc-950 dark:text-zinc-100 ${minHeightClass} ${className}`}
      />
    </div>
  )
}