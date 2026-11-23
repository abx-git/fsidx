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