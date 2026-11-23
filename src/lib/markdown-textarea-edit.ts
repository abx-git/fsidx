export interface TextareaEditResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

export function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder = '',
): TextareaEditResult {
  const selected = value.slice(start, end) || placeholder
  const next = value.slice(0, start) + before + selected + after + value.slice(end)
  const selStart = start + before.length
  const selEnd = selStart + selected.length
  return { value: next, selectionStart: selStart, selectionEnd: selEnd }
}

export function insertAtCursor(
  value: string,
  start: number,
  end: number,
  text: string,
): TextareaEditResult {
  const next = value.slice(0, start) + text + value.slice(end)
  const pos = start + text.length
  return { value: next, selectionStart: pos, selectionEnd: pos }
}

function lineBounds(value: string, cursor: number): { lineStart: number; lineEnd: number } {
  const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1
  let lineEnd = value.indexOf('\n', cursor)
  if (lineEnd === -1) lineEnd = value.length
  return { lineStart, lineEnd }
}

export function setHeadingAtCursor(value: string, cursor: number, level: 1 | 2 | 3): TextareaEditResult {
  const { lineStart, lineEnd } = lineBounds(value, cursor)
  const line = value.slice(lineStart, lineEnd)
  const stripped = line.replace(/^#{1,6}\s+/, '')
  const prefix = '#'.repeat(level) + ' '
  const newLine = stripped.length ? prefix + stripped : prefix
  const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd)
  const pos = lineStart + newLine.length
  return { value: next, selectionStart: pos, selectionEnd: pos }
}

export function prefixLinesInRange(
  value: string,
  start: number,
  end: number,
  linePrefix: string,
  ordered = false,
): TextareaEditResult {
  const blockStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  let blockEnd = end
  if (blockEnd < value.length && value[blockEnd] === '\n') {
    /* ok */
  } else {
    const nextNl = value.indexOf('\n', end)
    blockEnd = nextNl === -1 ? value.length : nextNl
  }
  const chunk = value.slice(blockStart, blockEnd)
  const lines = chunk.split('\n')
  const prefixed = lines.map((line, i) => {
    const stripped = line.replace(/^(\d+\.\s+|[-*+]\s+|>\s+)/, '')
    const p = ordered ? `${i + 1}. ` : linePrefix
    return stripped ? p + stripped : p.trimEnd()
  })
  const newChunk = prefixed.join('\n')
  const next = value.slice(0, blockStart) + newChunk + value.slice(blockEnd)
  const pos = blockStart + newChunk.length
  return { value: next, selectionStart: pos, selectionEnd: pos }
}

export function insertLink(
  value: string,
  start: number,
  end: number,
  url: string,
): TextareaEditResult {
  const text = value.slice(start, end) || 'Linktext'
  return insertAtCursor(value, start, end, `[${text}](${url})`)
}

export function insertImage(
  value: string,
  start: number,
  end: number,
  path: string,
): TextareaEditResult {
  const altText = value.slice(start, end) || 'Bild'
  return insertAtCursor(value, start, end, `![${altText}](${path})`)
}