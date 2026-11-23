import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { TextareaEditResult } from '../../lib/markdown-textarea-edit'
import { MarkdownBlockToolbar } from './MarkdownBlockToolbar'
import type { FileSourceStore } from '../../lib/file-sources'
import { caretOffsetFromPoint, mapRenderedOffsetToSource } from '../../lib/markdown-caret'
import {
  insertEmptyBlockAfter,
  joinMarkdownBlocks,
  mergeBlockWithPrevious,
  removeBlockAt,
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
  const previewRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const pendingSelection = useRef<TextareaEditResult | null>(null)
  const placeCursorAtEndFor = useRef<number | null>(null)
  const placeCursorAtOffset = useRef<number | null>(null)

  useEffect(() => {
    setActiveBlock(null)
  }, [docPath])

  const resizeArea = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 28)}px`
  }, [])

  const [activeTextarea, setActiveTextarea] = useState<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (activeBlock === null) {
      setActiveTextarea(null)
      return
    }
    setActiveTextarea(areaRefs.current.get(activeBlock) ?? null)
  }, [activeBlock, blocks])

  const focusBlock = useCallback(
    (index: number, opts?: { end?: boolean; offset?: number }) => {
      if (opts?.end) placeCursorAtEndFor.current = index
      else if (opts?.offset != null) placeCursorAtOffset.current = opts.offset
      setActiveBlock(index)
    },
    [],
  )

  useLayoutEffect(() => {
    if (activeBlock === null) return
    if (pendingSelection.current) return
    const el = areaRefs.current.get(activeBlock)
    if (!el) return

    if (placeCursorAtOffset.current != null) {
      const off = Math.min(Math.max(0, placeCursorAtOffset.current), el.value.length)
      placeCursorAtOffset.current = null
      placeCursorAtEndFor.current = null
      el.focus()
      el.setSelectionRange(off, off)
      resizeArea(el)
      return
    }

    if (placeCursorAtEndFor.current === activeBlock) {
      placeCursorAtEndFor.current = null
      el.focus()
      const len = el.value.length
      el.setSelectionRange(len, len)
      resizeArea(el)
    }
  }, [activeBlock, blocks, resizeArea])

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

  const applyBlocks = useCallback(
    (next: string[]) => {
      onChange(joinMarkdownBlocks(next))
    },
    [onChange],
  )

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

  const activateFromPreview = useCallback(
    (index: number, e: React.MouseEvent) => {
      const preview = previewRefs.current.get(index)
      if (!preview) {
        focusBlock(index, { end: true })
        return
      }
      const rendered = caretOffsetFromPoint(preview, e.clientX, e.clientY)
      if (rendered == null) {
        focusBlock(index, { end: true })
        return
      }
      const sourceOffset = mapRenderedOffsetToSource(blocks[index], rendered)
      focusBlock(index, { offset: sourceOffset })
    },
    [blocks, focusBlock],
  )

  const empty = blocks.length === 1 && !blocks[0].trim()

  return (
    <article
      className="markdown-preview mx-auto max-w-3xl px-4 py-6 text-left text-zinc-800 dark:text-zinc-100"
      onMouseDown={(e) => {
        if (!canWrite || activeBlock === null) return
        const t = e.target as HTMLElement
        if (t.closest('.markdown-block, .markdown-block-tail, .markdown-editor-toolbar')) return
        setActiveBlock(null)
      }}
    >
      {activeBlock !== null && (
        <div className="markdown-editor-toolbar sticky top-0 z-10 -mx-1 mb-2 rounded-lg border border-zinc-200/80 bg-white/95 px-1 py-0.5 shadow-sm backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-950/95">
          <MarkdownBlockToolbar
            textarea={activeTextarea}
            onApply={(result) => applyToolbarEdit(activeBlock, result)}
          />
        </div>
      )}

      <div className="markdown-block-flow">
        {blocks.map((block, index) => {
          const editing = canWrite && activeBlock === index
          const showPlaceholder = !block.trim() && !editing

          return (
            <section
              key={`${docPath}:${index}`}
              className={`markdown-block ${canWrite && !editing ? 'cursor-text' : ''}`}
            >
              {editing ? (
                <textarea
                  onMouseDown={(e) => e.stopPropagation()}
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
                  className="markdown-block-source w-full resize-none border-0 bg-transparent px-0 py-0.5 outline-none"
                  aria-label={`Markdown-Absatz ${index + 1}`}
                  onKeyDown={(e) => {
                    const el = e.currentTarget
                    const { selectionStart, selectionEnd, value } = el
                    const atStart = selectionStart === 0 && selectionEnd === 0
                    const atEnd = selectionStart === value.length && selectionEnd === value.length

                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setActiveBlock(null)
                      return
                    }

                    if (e.key === 'Enter' && !e.shiftKey && atEnd) {
                      e.preventDefault()
                      const next = insertEmptyBlockAfter(blocks, index)
                      applyBlocks(next)
                      focusBlock(index + 1, { end: true })
                      return
                    }

                    if (e.key === 'Backspace' && atStart && !value.trim() && index > 0) {
                      e.preventDefault()
                      const next = removeBlockAt(blocks, index)
                      applyBlocks(next)
                      focusBlock(index - 1, { end: true })
                      return
                    }

                    if (e.key === 'Backspace' && atStart && value.length > 0 && index > 0) {
                      e.preventDefault()
                      const prevLen = blocks[index - 1].length
                      const next = mergeBlockWithPrevious(blocks, index)
                      applyBlocks(next)
                      focusBlock(index - 1, { offset: prevLen })
                      return
                    }

                    if (e.key === 'ArrowUp' && atStart && index > 0) {
                      e.preventDefault()
                      focusBlock(index - 1, { end: true })
                      return
                    }

                    if (e.key === 'ArrowDown' && atEnd && index < blocks.length - 1) {
                      e.preventDefault()
                      focusBlock(index + 1, { offset: 0 })
                    }
                  }}
                />
              ) : showPlaceholder ? (
                <p
                  className="py-0.5 text-sm text-zinc-400/80 italic select-none"
                  onMouseDown={(e) => {
                    if (!canWrite) return
                    e.preventDefault()
                    focusBlock(index, { end: true })
                  }}
                >
                  —
                </p>
              ) : (
                <div
                  ref={(el) => {
                    if (el) previewRefs.current.set(index, el)
                    else previewRefs.current.delete(index)
                  }}
                  className="markdown-block-preview py-0.5"
                  onMouseDown={(e) => {
                    if (!canWrite) return
                    const t = e.target as HTMLElement
                    if (t.closest('a, button')) return
                    e.preventDefault()
                    activateFromPreview(index, e)
                  }}
                >
                  <MarkdownContent content={block} docPath={docPath} fileSources={fileSources} />
                </div>
              )}
            </section>
          )
        })}
      </div>

      {canWrite && (
        <div
          role="presentation"
          className="markdown-block-tail mt-3 min-h-[4rem] cursor-text rounded-md text-xs text-zinc-400/0 hover:text-zinc-400/70 dark:hover:text-zinc-500/70"
          onMouseDown={(e) => {
            e.preventDefault()
            if (empty) {
              focusBlock(0, { end: true })
              return
            }
            if (activeBlock === blocks.length - 1) return
            const last = blocks[blocks.length - 1]
            if (last.trim() === '') {
              focusBlock(blocks.length - 1, { end: true })
              return
            }
            const next = insertEmptyBlockAfter(blocks, blocks.length - 1)
            applyBlocks(next)
            focusBlock(blocks.length, { end: true })
          }}
          aria-label="Neuen Absatz hinzufügen"
        />
      )}

      {empty && canWrite && activeBlock === null && (
        <p className="pointer-events-none -mt-14 text-center text-sm text-zinc-400">
          Klicken, um zu schreiben…
        </p>
      )}
    </article>
  )
}