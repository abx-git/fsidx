import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  appendParagraphBlock,
  splitMarkdownBlocks,
  updateBlockInMarkdown,
  type MarkdownBlock,
} from '../../lib/markdown-blocks'

interface LivePreviewMarkdownProps {
  content: string
  onChange: (value: string) => void
  canWrite: boolean
}

function AutoTextarea({
  value,
  onChange,
  onCommit,
  onCancel,
  className,
}: {
  value: string
  onChange: (v: string) => void
  onCommit: () => void
  onCancel: () => void
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const skipBlur = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 72)}px`
  }, [])

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 72)}px`
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value)
        resize()
      }}
      onBlur={() => {
        if (skipBlur.current) {
          skipBlur.current = false
          return
        }
        onCommit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          skipBlur.current = true
          onCancel()
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault()
          onCommit()
        }
      }}
      spellCheck={false}
      className={className}
    />
  )
}

function BlockView({
  block,
  canWrite,
  isEditing,
  draft,
  onStartEdit,
  onDraftChange,
  onCommit,
  onCancel,
}: {
  block: MarkdownBlock
  canWrite: boolean
  isEditing: boolean
  draft: string
  onStartEdit: () => void
  onDraftChange: (v: string) => void
  onCommit: () => void
  onCancel: () => void
}) {
  if (isEditing) {
    return (
      <AutoTextarea
        value={draft}
        onChange={onDraftChange}
        onCommit={onCommit}
        onCancel={onCancel}
        className="w-full resize-none rounded-lg border border-emerald-400/80 bg-zinc-50 px-3 py-2 font-mono text-sm leading-relaxed text-zinc-900 shadow-sm outline-none ring-2 ring-emerald-500/30 dark:border-emerald-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
    )
  }

  const empty = block.raw.trim() === ''

  return (
    <div
      role={canWrite ? 'button' : undefined}
      tabIndex={canWrite ? 0 : undefined}
      onClick={(e) => {
        if (!canWrite) return
        const t = e.target as HTMLElement
        if (t.closest('a, button')) return
        onStartEdit()
      }}
      onKeyDown={(e) => {
        if (canWrite && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onStartEdit()
        }
      }}
      className={`rounded-lg px-1 py-0.5 text-left transition-colors ${
        canWrite
          ? 'cursor-text hover:bg-emerald-50/80 hover:ring-1 hover:ring-emerald-200/60 dark:hover:bg-emerald-950/20 dark:hover:ring-emerald-800/50'
          : ''
      } ${empty ? 'min-h-[2rem] text-zinc-400' : ''}`}
    >
      {empty ? (
        <span className="text-sm italic">{canWrite ? 'Klicken zum Schreiben…' : '—'}</span>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.raw}</ReactMarkdown>
      )}
    </div>
  )
}

export function LivePreviewMarkdown({ content, onChange, canWrite }: LivePreviewMarkdownProps) {
  const blocks = useMemo(() => splitMarkdownBlocks(content), [content])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setEditingId(null)
    setDraft('')
  }, [content])

  const startEdit = useCallback((block: MarkdownBlock) => {
    if (!canWrite) return
    setEditingId(block.id)
    setDraft(block.raw)
  }, [canWrite])

  const commit = useCallback(() => {
    if (!editingId) return
    const next = updateBlockInMarkdown(content, editingId, draft)
    onChange(next)
    setEditingId(null)
    setDraft('')
  }, [content, draft, editingId, onChange])

  const cancel = useCallback(() => {
    setEditingId(null)
    setDraft('')
  }, [])

  const handleAppendParagraph = () => {
    if (!canWrite) return
    const next = appendParagraphBlock(content)
    onChange(next)
    const parsed = splitMarkdownBlocks(next)
    const last = parsed[parsed.length - 1]
    if (last) {
      queueMicrotask(() => {
        setEditingId(last.id)
        setDraft('')
      })
    }
  }

  return (
    <article className="markdown-preview mx-auto max-w-3xl px-6 py-8 text-left text-zinc-800 dark:text-zinc-100">
      <div className="flex flex-col gap-3">
        {blocks.map((block) => (
          <BlockView
            key={block.id}
            block={block}
            canWrite={canWrite}
            isEditing={editingId === block.id}
            draft={draft}
            onStartEdit={() => startEdit(block)}
            onDraftChange={setDraft}
            onCommit={commit}
            onCancel={cancel}
          />
        ))}
      </div>
      {canWrite && (
        <button
          type="button"
          onClick={handleAppendParagraph}
          className="mt-6 text-sm text-emerald-700 hover:underline dark:text-emerald-400"
        >
          + Absatz hinzufügen
        </button>
      )}
      {canWrite && (
        <p className="mt-4 text-[11px] text-zinc-400">
          Klick auf Absatz, Liste oder Tabelle zum Bearbeiten · Esc abbrichen · Strg+Enter übernehmen
        </p>
      )}
    </article>
  )
}