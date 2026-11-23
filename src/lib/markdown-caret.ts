/** Text offset within `container` for a document coordinates click (preview → source). */
export function caretOffsetFromPoint(
  container: HTMLElement,
  clientX: number,
  clientY: number,
): number | null {
  const doc = container.ownerDocument
  let range: Range | null = null
  if (typeof doc.caretRangeFromPoint === 'function') {
    range = doc.caretRangeFromPoint(clientX, clientY)
  } else if (
    'caretPositionFromPoint' in doc &&
    typeof (doc as Document & { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } | null })
      .caretPositionFromPoint === 'function'
  ) {
    const pos = (
      doc as Document & { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } | null }
    ).caretPositionFromPoint(clientX, clientY)
    if (pos) {
      range = doc.createRange()
      range.setStart(pos.offsetNode, pos.offset)
      range.collapse(true)
    }
  }
  if (!range || !container.contains(range.startContainer)) return null

  const pre = doc.createRange()
  pre.selectNodeContents(container)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString().length
}

/** Map rendered plain-text offset to a position in markdown source (best effort). */
export function mapRenderedOffsetToSource(source: string, renderedOffset: number): number {
  if (renderedOffset <= 0) return 0
  let plain = ''
  let sourceIndex = 0
  const len = source.length

  const skipMarkup = (i: number): number => {
    if (source[i] === '#' && (i === 0 || source[i - 1] === '\n')) {
      while (i < len && source[i] === '#') i++
      if (source[i] === ' ') i++
      return i
    }
    if (source.startsWith('**', i) || source.startsWith('__', i)) return i + 2
    if (source.startsWith('~~', i)) return i + 2
    if (source[i] === '*' || source[i] === '_') return i + 1
    if (source[i] === '`') return i + 1
    if (i > 0 && source.startsWith('](', i - 1)) {
      const close = source.indexOf(')', i)
      return close === -1 ? i : close + 1
    }
    return i
  }

  while (sourceIndex < len && plain.length < renderedOffset) {
    const skipped = skipMarkup(sourceIndex)
    if (skipped !== sourceIndex) {
      sourceIndex = skipped
      continue
    }
    const ch = source[sourceIndex]
    if (ch === '\r') {
      sourceIndex++
      continue
    }
    plain += ch
    sourceIndex++
  }
  return Math.min(sourceIndex, len)
}