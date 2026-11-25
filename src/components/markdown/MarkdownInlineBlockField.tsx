import { useCallback, useEffect, useRef } from 'react'
import type { TextareaEditResult } from '../../lib/markdown-textarea-edit'
import { MarkdownBlockToolbar } from './MarkdownBlockToolbar'

interface MarkdownInlineBlockFieldProps {
  value: string
  onChange: (value: string) => void
  onEnterSplit: (cursor: number) => void
  onDismiss: () => void
  disabled?: boolean
  className?: string
  variant?: 'prose' | 'code'
}

export function MarkdownInlineBlockField({
  value,
  onChange,
  onEnterSplit,
  onDismiss,
  disabled = false,
  className,
  variant = 'prose',
}: MarkdownInlineBlockFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const pendingSelection = useRef<TextareaEditResult | null>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  useEffect(() => {
    if (!pendingSelection.current || !ref.current) return
    const pending = pendingSelection.current
    pendingSelection.current = null
    ref.current.focus()
    ref.current.setSelectionRange(pending.selectionStart, pending.selectionEnd)
  }, [value])

  const applyEdit = useCallback(
    (result: TextareaEditResult) => {
      pendingSelection.current = result
      onChange(result.value)
    },
    [onChange],
  )

  const shell =
    variant === 'code'
      ? 'border-violet-400/70 bg-violet-50/80 dark:border-violet-600 dark:bg-violet-950/35'
      : 'border-sky-400/70 bg-sky-50/80 dark:border-sky-600 dark:bg-sky-950/40'
  const fieldBorder =
    variant === 'code'
      ? 'border-violet-200 dark:border-violet-800'
      : 'border-sky-200 dark:border-sky-800'
  const hint =
    variant === 'code'
      ? 'text-violet-900/70 dark:text-violet-200/80'
      : 'text-sky-900/70 dark:text-sky-200/80'

  return (
    <div
      className={[
        'my-1 rounded-md border p-1 shadow-sm',
        shell,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <MarkdownBlockToolbar textarea={ref.current} onApply={applyEdit} disabled={disabled} />
      <textarea
        ref={ref}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            onDismiss()
            return
          }
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onEnterSplit(ref.current?.selectionStart ?? value.length)
          }
        }}
        rows={Math.min(24, Math.max(2, value.split('\n').length))}
        className={`mt-1 w-full resize-y rounded border ${fieldBorder} bg-white px-2 py-1.5 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500/40 dark:bg-zinc-950 dark:text-zinc-100`}
        spellCheck
      />
      <p className={`px-1 pt-0.5 text-[10px] ${hint}`}>
        Enter = neuer Absatz (beide Teile bleiben bearbeitbar) · Esc = fertig
      </p>
    </div>
  )
}