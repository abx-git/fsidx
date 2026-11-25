/** Grobe sichtbare Zeichenfolge aus Markdown (für Klick→Quelle). */
export function stripMarkdownInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[\[[^\]]+\]\]/g, '')
    .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\|/g, '')
}

function caretOffsetInElement(block: Element, clientX: number, clientY: number): number {
  const doc = block.ownerDocument
  let startNode: Node | null = null
  let startOffset = 0

  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(clientX, clientY)
    if (range) {
      startNode = range.startContainer
      startOffset = range.startOffset
    }
  } else if (typeof (doc as Document & { caretPositionFromPoint?: unknown }).caretPositionFromPoint === 'function') {
    const pos = (
      doc as Document & {
        caretPositionFromPoint: (x: number, y: number) => {
          offsetNode: Node
          offset: number
        } | null
      }
    ).caretPositionFromPoint(clientX, clientY)
    if (pos) {
      startNode = pos.offsetNode
      startOffset = pos.offset
    }
  }

  if (!startNode) return 0

  if (!block.contains(startNode)) return 0

  const pre = doc.createRange()
  pre.selectNodeContents(block)
  pre.setEnd(startNode, startOffset)
  return pre.toString().length
}

function blockSourceSlice(source: string, startLine1: number, endLine1: number): string {
  const lines = source.split('\n')
  const start = Math.max(0, startLine1 - 1)
  const end = Math.min(lines.length - 1, endLine1 - 1)
  if (start > end || start >= lines.length) return ''
  return lines.slice(start, end + 1).join('\n')
}

function globalOffsetForBlockSlice(source: string, startLine1: number): number {
  const lines = source.split('\n')
  const start = Math.max(0, startLine1 - 1)
  if (start === 0) return 0
  let off = 0
  for (let i = 0; i < start; i++) {
    off += lines[i].length + 1
  }
  return off
}

export function mapPlainPrefixToSourceOffset(blockSource: string, plainPrefix: string): number {
  if (!plainPrefix) return 0
  const target = plainPrefix
  let best = 0
  for (let off = 0; off <= blockSource.length; off++) {
    const visible = stripMarkdownInline(blockSource.slice(0, off))
    if (visible === target) return off
    if (visible.length <= target.length && target.startsWith(visible)) best = off
  }
  return best
}

export interface MdBlockPosition {
  startLine?: number
  endLine?: number
  noInlineEdit?: boolean
}

export function mdBlockDataAttrs(pos: MdBlockPosition): Record<string, string> | undefined {
  if (!pos.startLine) return undefined
  const end = pos.endLine ?? pos.startLine
  const attrs: Record<string, string> = {
    'data-md-source-start': String(pos.startLine),
    'data-md-source-end': String(end),
  }
  if (pos.noInlineEdit) attrs['data-md-no-inline-edit'] = '1'
  return attrs
}

export function lineNumberAtOffset(source: string, offset: number): number {
  const clamped = Math.min(Math.max(0, offset), source.length)
  return source.slice(0, clamped).split('\n').length
}

function wordBoundsInPlain(text: string, index: number): { start: number; end: number } {
  const i = Math.min(Math.max(0, index), text.length)
  const isWord = (ch: string) => /[\p{L}\p{N}_]/u.test(ch)
  let start = i
  let end = i
  while (start > 0 && isWord(text[start - 1]!)) start -= 1
  while (end < text.length && isWord(text[end]!)) end += 1
  if (start === end && i < text.length) {
    end = Math.min(text.length, i + 1)
    start = i
  }
  return { start, end }
}

function selectionPlainRangeInBlock(
  block: Element,
  clientX: number,
  clientY: number,
): { start: number; end: number } {
  const sel = block.ownerDocument.getSelection()
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const range = sel.getRangeAt(0)
    if (block.contains(range.startContainer) && block.contains(range.endContainer)) {
      const doc = block.ownerDocument
      const startR = doc.createRange()
      startR.selectNodeContents(block)
      startR.setEnd(range.startContainer, range.startOffset)
      const endR = doc.createRange()
      endR.selectNodeContents(block)
      endR.setEnd(range.endContainer, range.endOffset)
      const start = startR.toString().length
      const end = endR.toString().length
      if (end > start) return { start, end }
    }
  }
  const caret = caretOffsetInElement(block, clientX, clientY)
  return wordBoundsInPlain(block.textContent ?? '', caret)
}

export interface PreviewClickSourceRange {
  start: number
  end: number
  line: number
}

/** Quell-Offset aus Doppelklick in der gerenderten Vorschau. */
export function sourceOffsetFromPreviewClick(
  source: string,
  articleRoot: HTMLElement,
  clientX: number,
  clientY: number,
): number {
  return sourceRangeFromPreviewClick(source, articleRoot, clientX, clientY).start
}

export function sourceRangeFromPreviewClick(
  source: string,
  articleRoot: HTMLElement,
  clientX: number,
  clientY: number,
): PreviewClickSourceRange {
  const empty: PreviewClickSourceRange = { start: 0, end: 0, line: 1 }
  const hit = document.elementFromPoint(clientX, clientY)
  if (!hit || !articleRoot.contains(hit)) return empty

  const block = (hit as Element).closest('[data-md-source-start]') as HTMLElement | null
  if (!block) return empty

  const startLine = Number.parseInt(block.dataset.mdSourceStart ?? '', 10)
  const endLine = Number.parseInt(block.dataset.mdSourceEnd ?? String(startLine), 10)
  if (!Number.isFinite(startLine) || startLine < 1) return empty

  const blockSource = blockSourceSlice(source, startLine, endLine)
  const base = globalOffsetForBlockSlice(source, startLine)
  const blockPlain = block.textContent ?? ''
  const { start: plainStart, end: plainEnd } = selectionPlainRangeInBlock(block, clientX, clientY)
  const innerStart = mapPlainPrefixToSourceOffset(blockSource, blockPlain.slice(0, plainStart))
  const innerEnd = mapPlainPrefixToSourceOffset(blockSource, blockPlain.slice(0, plainEnd))
  const start = Math.min(source.length, base + innerStart)
  const end = Math.max(start, Math.min(source.length, base + innerEnd))
  return {
    start,
    end,
    line: lineNumberAtOffset(source, start),
  }
}

export function blockCoversSourceLine(
  el: HTMLElement,
  line: number,
): boolean {
  const start = Number.parseInt(el.dataset.mdSourceStart ?? '', 10)
  const end = Number.parseInt(el.dataset.mdSourceEnd ?? String(start), 10)
  if (!Number.isFinite(start)) return false
  return line >= start && line <= end
}

export function scrollContainerToSourceLine(
  scrollEl: HTMLElement,
  article: HTMLElement,
  line: number,
  paddingPx = 96,
): void {
  const blocks = [...article.querySelectorAll<HTMLElement>('[data-md-source-start]')]
  const target =
    blocks.find((b) => blockCoversSourceLine(b, line)) ??
    blocks.find((b) => Number.parseInt(b.dataset.mdSourceStart ?? '0', 10) >= line) ??
    blocks[blocks.length - 1]
  if (!target) {
    scrollEl.scrollTop = 0
    return
  }
  const scrollRect = scrollEl.getBoundingClientRect()
  const blockTop = target.getBoundingClientRect().top - scrollRect.top + scrollEl.scrollTop
  scrollEl.scrollTop = Math.max(0, blockTop - paddingPx)
}

export function scrollTextareaToSourceLine(
  textarea: HTMLTextAreaElement,
  source: string,
  line: number,
  paddingPx = 96,
): void {
  const style = window.getComputedStyle(textarea)
  const lineHeight = Number.parseFloat(style.lineHeight) || 20
  const safeLine = Math.min(Math.max(1, line), source.split('\n').length)
  scrollTextareaToLine(textarea, safeLine, paddingPx, lineHeight)
}

/** Scrollt eine Zeile in einem äußeren Overflow-Container (Auto-Height-Textarea). */
export function scrollTextareaInContainer(
  scrollEl: HTMLElement,
  textarea: HTMLTextAreaElement,
  line: number,
  paddingPx = 96,
): void {
  const style = window.getComputedStyle(textarea)
  const lh = Number.parseFloat(style.lineHeight) || 20
  const pt = Number.parseFloat(style.paddingTop) || 0
  const safeLine = Math.max(1, line)
  const lineTop = (safeLine - 1) * lh + pt
  scrollEl.scrollTop = Math.max(0, lineTop - paddingPx)
}

export function scrollTextareaToLine(
  textarea: HTMLTextAreaElement,
  line: number,
  paddingPx = 96,
  lineHeight?: number,
  scrollParent?: HTMLElement | null,
): void {
  if (scrollParent) {
    scrollTextareaInContainer(scrollParent, textarea, line, paddingPx)
    return
  }
  const lh =
    lineHeight ??
    (Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 20)
  textarea.scrollTop = Math.max(0, (line - 1) * lh - paddingPx)
}