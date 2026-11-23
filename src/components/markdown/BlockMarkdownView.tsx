import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { TextareaEditResult } from '../../lib/markdown-textarea-edit'
import { MarkdownBlockToolbar } from './MarkdownBlockToolbar'
import type { FileSourceStore } from '../../lib/file-sources'
import {
  joinMarkdownBlocks,
  replaceMarkdownBlock,
  splitMarkdownBlocks,
} from '../../lib/markdown-blocks'
import { MarkdownContent } from './MarkdownContent'

interface BlockMarkdownViewProps {
  content: string
  onChange: (value: string) => void
  canWrite: boolean
  docPath: string
  fileSources: FileSourceStore | null
}

export function BlockMarkdownView({
  content,
  onChange,
  canWrite,
  docPath,
  fileSources,
}: BlockMarkdownViewProps) {
  const blocks = useMemo(() => splitMarkdownBlocks(content), [content])
  const [activeBlock, setActiveBlock] = useState<number | null>(null)
  const areaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map())
  const pendingSelection = useRef<TextareaEditResult | null>(null)

  useEffect(() => {
    setActiveBlock(null)
  }, [docPath])

  const resizeArea = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 48)}px`
  }, [])

  const [activeTextarea, setActiveTextarea] = useState<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (activeBlock === null) {
      setActiveTextarea(null)
      return
    }
    setActiveTextarea(areaRefs.current.get(activeBlock) ?? null)
  }, [activeBlock, blocks])

  useEffect(() => {
    if (activeBlock === null) return
    if (pendingSelection.current) return
    const el = areaRefs.current.get(activeBlock)
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [activeBlock])

  useLayoutEffect(() => {
    if (activeBlock === null || !pendingSelection.current) return
    const el = areaRefs.current.get(activeBlock)
    const pending = pendingSelection.current
    pendingSelection.current = null
    if (!el) return
    el.focus()
    el.setSelectionRange(pending.selectionStart, pending.selectionEnd)
    resizeArea(el)
  }, [blocks, activeBlock, resizeArea])

  const handleBlockChange = useCallback(
    (index: number, value: string) => {
      onChange(replaceMarkdownBlock(blocks, index, value))
    },
    [blocks, onChange],
  )

  const applyToolbarEdit = useCallback(
    (index: number, result: TextareaEditResult) => {
      pendingSelection.current = result
      handleBlockChange(index, result.value)
    },
    [handleBlockChange],
  )

  const empty = blocks.length === 1 && !blocks[0].trim()

  return (
    <article className="markdown-preview mx-auto max-w-3xl px-4 py-6 text-left text-zinc-800 dark:text-zinc-100">
      {empty && canWrite && activeBlock === null && (
        <button
          type="button"
          className="mb-4 w-full rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-sm text-zinc-400 hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-700 dark:border-zinc-600 dark:hover:border-violet-700 dark:hover:bg-violet-950/20 dark:hover:text-violet-200"
          onClick={() => setActiveBlock(0)}
        >
          Klicken, um zu schreiben…
        </button>
      )}

      <div className="space-y-1">
        {blocks.map((block, index) => {
          const editing = canWrite && activeBlock === index
          const showPlaceholder = !block.trim() && !editing

          return (
            <section
              key={`${docPath}:${index}`}
              className={`markdown-block rounded-md transition-colors ${
                editing
                  ? 'bg-violet-50/80 ring-2 ring-violet-400/60 dark:bg-violet-950/20 dark:ring-violet-500/40'
                  : canWrite
                    ? 'cursor-text hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40'
                    : ''
              }`}
              onMouseDown={(e) => {
                if (!canWrite) return
                if ((e.target as HTMLElement).closest('a, button')) return
                e.preventDefault()
                setActiveBlock(index)
              }}
            >
              {editing ? (
                <>
                <MarkdownBlockToolbar
                  textarea={activeBlock === index ? activeTextarea : null}
                  onApply={(result) => applyToolbarEdit(index, result)}
                />
                <textarea
                  ref={(el) => {
                    if (el) {
                      areaRefs.current.set(index, el)
                      resizeArea(el)
                    } else areaRefs.current.delete(index)
                  }}
                  value={block}
                  onChange={(e) => {
                    handleBlockChange(index, e.target.value)
                    resizeArea(e.target)
                  }}
                  spellCheck
                  className="block w-full resize-none border-0 bg-transparent px-3 py-2 font-mono text-sm leading-relaxed text-zinc-900 outline-none dark:text-zinc-100"
                  aria-label={`Markdown-Block ${index + 1}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setActiveBlock(null)
                    }
                  }}
                />
                </>
              ) : showPlaceholder ? (
                <p className="px-3 py-2 text-sm italic text-zinc-400">Leerer Block</p>
              ) : (
                <div className="px-3 py-1.5">
                  <MarkdownContent
                    content={block}
                    docPath={docPath}
                    fileSources={fileSources}
                  />
                </div>
              )}
            </section>
          )
        })}
      </div>

      {canWrite && blocks.length > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            type="button"
            className="text-xs text-zinc-500 hover:text-violet-700 dark:hover:text-violet-300"
            onClick={() => {
              const next = joinMarkdownBlocks([...blocks, ''])
              onChange(next)
              setActiveBlock(blocks.length)
            }}
          >
            + Absatz hinzufügen
          </button>
        </div>
      )}
    </article>
  )
}