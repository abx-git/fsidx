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
}

export function mdBlockDataAttrs(pos: MdBlockPosition): Record<string, string> | undefined {
  if (!pos.startLine) return undefined
  const end = pos.endLine ?? pos.startLine
  return {
    'data-md-source-start': String(pos.startLine),
    'data-md-source-end': String(end),
  }
}

/** Quell-Offset aus Doppelklick in der gerenderten Vorschau. */
export function sourceOffsetFromPreviewClick(
  source: string,
  articleRoot: HTMLElement,
  clientX: number,
  clientY: number,
): number {
  const hit = document.elementFromPoint(clientX, clientY)
  if (!hit || !articleRoot.contains(hit)) return 0

  const block = (hit as Element).closest('[data-md-source-start]') as HTMLElement | null
  if (!block) return 0

  const startLine = Number.parseInt(block.dataset.mdSourceStart ?? '', 10)
  const endLine = Number.parseInt(block.dataset.mdSourceEnd ?? String(startLine), 10)
  if (!Number.isFinite(startLine) || startLine < 1) return 0

  const blockSource = blockSourceSlice(source, startLine, endLine)
  const base = globalOffsetForBlockSlice(source, startLine)
  const caretInBlock = caretOffsetInElement(block, clientX, clientY)
  const blockPlain = block.textContent ?? ''
  const plainPrefix = blockPlain.slice(0, Math.min(caretInBlock, blockPlain.length))
  const inner = mapPlainPrefixToSourceOffset(blockSource, plainPrefix)
  return Math.min(source.length, base + inner)
}