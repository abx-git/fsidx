export type MarkdownBlockKind =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'table'
  | 'list'
  | 'blockquote'
  | 'hr'
  | 'empty'

export interface MarkdownBlock {
  /** Stable key from start line index in source */
  id: string
  kind: MarkdownBlockKind
  raw: string
  startLine: number
}

function isTableRow(line: string): boolean {
  const t = line.trim()
  return t.includes('|') && !t.startsWith('```')
}

function isTableDelimiterRow(line: string): boolean {
  const t = line.trim()
  if (!t.includes('|')) return false
  return /^\|?[\s:-]+\|/.test(t) || /^[\s|:-]+$/.test(t.replace(/\|/g, ''))
}

function isListLine(line: string): boolean {
  return /^\s*([-*+]|\d+\.)\s+/.test(line)
}

function isBlockquoteLine(line: string): boolean {
  return /^>\s?/.test(line)
}

function isHrLine(line: string): boolean {
  return /^(---|\*\*\*|___)\s*$/.test(line.trim())
}

function kindFromFirstLine(line: string): MarkdownBlockKind {
  if (isHrLine(line)) return 'hr'
  if (/^#{1,6}\s/.test(line)) return 'heading'
  if (isBlockquoteLine(line)) return 'blockquote'
  if (isListLine(line)) return 'list'
  return 'paragraph'
}

function blockId(startLine: number): string {
  return `L${startLine}`
}

/** Split markdown into edit/view blocks (Obsidian-style “blocks”). */
export function splitMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.split('\n')
  const blocks: MarkdownBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (line.trim().startsWith('```')) {
      const start = i
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) i++
      if (i < lines.length) i++
      blocks.push({
        id: blockId(start),
        kind: 'code',
        raw: lines.slice(start, i).join('\n'),
        startLine: start,
      })
      continue
    }

    if (isTableRow(line) && (i + 1 < lines.length ? isTableDelimiterRow(lines[i + 1]) || isTableRow(lines[i + 1]) : true)) {
      const start = i
      i++
      while (i < lines.length && (isTableRow(lines[i]) || isTableDelimiterRow(lines[i]))) i++
      blocks.push({
        id: blockId(start),
        kind: 'table',
        raw: lines.slice(start, i).join('\n'),
        startLine: start,
      })
      continue
    }

    if (isBlockquoteLine(line)) {
      const start = i
      i++
      while (i < lines.length) {
        if (lines[i].trim() === '') break
        if (isBlockquoteLine(lines[i])) {
          i++
          continue
        }
        break
      }
      blocks.push({
        id: blockId(start),
        kind: 'blockquote',
        raw: lines.slice(start, i).join('\n'),
        startLine: start,
      })
      continue
    }

    if (isListLine(line)) {
      const start = i
      i++
      while (i < lines.length) {
        if (lines[i].trim() === '') break
        if (isListLine(lines[i]) || /^\s{2,}\S/.test(lines[i])) {
          i++
          continue
        }
        break
      }
      blocks.push({
        id: blockId(start),
        kind: 'list',
        raw: lines.slice(start, i).join('\n'),
        startLine: start,
      })
      continue
    }

    if (isHrLine(line)) {
      blocks.push({ id: blockId(i), kind: 'hr', raw: line, startLine: i })
      i++
      continue
    }

    const start = i
    const kind = kindFromFirstLine(line)
    i++
    while (i < lines.length && lines[i].trim() !== '') i++
    blocks.push({
      id: blockId(start),
      kind,
      raw: lines.slice(start, i).join('\n'),
      startLine: start,
    })
  }

  if (blocks.length === 0) {
    blocks.push({ id: blockId(0), kind: 'empty', raw: '', startLine: 0 })
  }

  return blocks
}

export function blocksToMarkdown(blocks: MarkdownBlock[]): string {
  const nonTrailingEmpty = blocks.filter((b, idx, arr) => {
    if (b.raw === '' && idx === arr.length - 1 && arr.length > 1) return false
    return true
  })
  return nonTrailingEmpty.map((b) => b.raw).join('\n\n')
}

export function updateBlockInMarkdown(
  content: string,
  blockIdKey: string,
  nextRaw: string,
): string {
  const blocks = splitMarkdownBlocks(content)
  const idx = blocks.findIndex((b) => b.id === blockIdKey)
  if (idx < 0) return content
  const next = [...blocks]
  if (nextRaw.trim() === '' && blocks.length > 1) {
    next.splice(idx, 1)
  } else {
    const firstLine = nextRaw.split('\n')[0] ?? ''
    next[idx] = {
      ...next[idx],
      raw: nextRaw,
      kind: nextRaw.trim() === '' ? 'empty' : kindFromFirstLine(firstLine),
    }
  }
  if (next.length === 0) {
    next.push({ id: blockId(0), kind: 'empty', raw: '', startLine: 0 })
  }
  return blocksToMarkdown(next)
}

export function appendParagraphBlock(content: string): string {
  const blocks = splitMarkdownBlocks(content)
  const last = blocks[blocks.length - 1]
  if (last?.kind === 'empty' && last.raw === '') {
    return content.trimEnd() === '' ? '' : blocksToMarkdown(blocks)
  }
  const nextLine = content.split('\n').length + 2
  blocks.push({
    id: blockId(nextLine),
    kind: 'empty',
    raw: '',
    startLine: nextLine,
  })
  return blocksToMarkdown(blocks)
}