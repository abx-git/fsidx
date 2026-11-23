import type { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNodeRef } from '@lezer/common'

export interface DocRange {
  from: number
  to: number
}

export function isTableLine(text: string): boolean {
  const t = text.trim()
  if (!t.includes('|')) return false
  if (/^\|?\s*:?-{3,}/.test(t)) return true
  const pipes = (t.match(/\|/g) ?? []).length
  return t.startsWith('|') || t.endsWith('|') || pipes >= 2
}

export function findTableRanges(state: EditorState): DocRange[] {
  const tables: DocRange[] = []
  const doc = state.doc
  let lineNo = 1

  while (lineNo <= doc.lines) {
    const line = doc.line(lineNo)
    if (!isTableLine(line.text)) {
      lineNo++
      continue
    }

    let start = line.from
    let end = line.to
    let next = lineNo + 1
    const tableLines: string[] = [line.text]

    while (next <= doc.lines) {
      const row = doc.line(next)
      if (isTableLine(row.text)) {
        tableLines.push(row.text)
        end = row.to
        next++
        continue
      }
      if (!row.text.trim()) {
        next++
        break
      }
      break
    }

    const hasSeparator = tableLines.some((l) => /^\|?\s*:?-{3,}/.test(l.trim()))
    if (tableLines.length >= 2 || (tableLines.length === 1 && hasSeparator)) {
      tables.push({ from: start, to: end })
    }

    lineNo = next
  }

  return tables
}

export function findFencedCodeRanges(state: EditorState): DocRange[] {
  const ranges: DocRange[] = []
  syntaxTree(state).iterate({
    enter(node: SyntaxNodeRef) {
      if (node.type.name === 'FencedCode') {
        ranges.push({ from: node.from, to: node.to })
      }
    },
  })
  return ranges
}

function lineRange(state: EditorState, lineNo: number): DocRange {
  const line = state.doc.line(lineNo)
  return { from: line.from, to: line.to }
}

export function lineInAnyRange(state: EditorState, lineNo: number, ranges: DocRange[]): boolean {
  const line = lineRange(state, lineNo)
  return ranges.some((r) => rangesOverlap(r, line))
}

/** Absätze (Leerzeile-getrennt), ohne Tabellen/Code-Zeilen. */
export function findParagraphRanges(state: EditorState, skipRanges: DocRange[]): DocRange[] {
  const paragraphs: DocRange[] = []
  const doc = state.doc
  let lineNo = 1

  while (lineNo <= doc.lines) {
    if (lineInAnyRange(state, lineNo, skipRanges)) {
      lineNo++
      continue
    }

    const line = state.doc.line(lineNo)
    if (!line.text.trim()) {
      lineNo++
      continue
    }

    const start = lineNo
    let end = lineNo
    let scan = lineNo + 1
    while (scan <= doc.lines) {
      if (lineInAnyRange(state, scan, skipRanges)) break
      const row = state.doc.line(scan)
      if (!row.text.trim()) break
      end = scan
      scan++
    }

    paragraphs.push({
      from: doc.line(start).from,
      to: doc.line(end).to,
    })
    lineNo = scan + 1
  }

  return paragraphs
}

export function splitParagraphAroundLine(
  state: EditorState,
  paragraph: DocRange,
  activeLineNo: number,
): { before?: DocRange; after?: DocRange } {
  const first = state.doc.lineAt(paragraph.from).number
  const last = state.doc.lineAt(paragraph.to).number
  if (activeLineNo < first || activeLineNo > last) return {}

  let before: DocRange | undefined
  let after: DocRange | undefined

  if (activeLineNo > first) {
    before = { from: paragraph.from, to: state.doc.line(activeLineNo - 1).to }
  }
  if (activeLineNo < last) {
    after = { from: state.doc.line(activeLineNo + 1).from, to: paragraph.to }
  }
  return { before, after }
}

export function fencedCodeAtCursor(state: EditorState, head: number): DocRange | null {
  let found: DocRange | null = null
  syntaxTree(state).iterate({
    enter(node: SyntaxNodeRef) {
      if (node.type.name !== 'FencedCode') return
      if (head >= node.from && head <= node.to) {
        found = { from: node.from, to: node.to }
        return false
      }
    },
  })
  return found
}

export function tableAtCursor(state: EditorState, head: number): DocRange | null {
  for (const table of findTableRanges(state)) {
    if (head >= table.from && head <= table.to) return table
  }
  return null
}

/** Stabiler Schlüssel für „gleicher Bearbeitungskontext“ (kein Neuzeichnen bei Cursor in der Zeile). */
export function activeRegionKey(state: EditorState): string {
  const head = state.selection.main.head
  const fence = fencedCodeAtCursor(state, head)
  if (fence) return `fence:${state.doc.lineAt(fence.from).number}`
  const table = tableAtCursor(state, head)
  if (table) return `table:${state.doc.lineAt(table.from).number}`
  return `line:${state.doc.lineAt(head).number}`
}

/** Obsidian: eine Zeile Quelltext — außer Tabelle/Code, dann der ganze Block. */
export function activeEditRegion(state: EditorState): DocRange {
  const head = state.selection.main.head

  const fence = fencedCodeAtCursor(state, head)
  if (fence) return fence

  const table = tableAtCursor(state, head)
  if (table) return table

  const line = state.doc.lineAt(head)
  return { from: line.from, to: line.to }
}

export function rangesOverlap(a: DocRange, b: DocRange): boolean {
  return a.from <= b.to && b.from <= a.to
}

export function eachLineInRange(
  state: EditorState,
  range: DocRange,
  fn: (lineNumber: number, from: number, to: number) => void,
) {
  let pos = range.from
  while (pos <= range.to) {
    const line = state.doc.lineAt(pos)
    fn(line.number, line.from, line.to)
    if (line.to >= range.to) break
    pos = line.to + 1
  }
}