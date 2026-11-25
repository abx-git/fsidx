/** Zeilen 1-basiert, inkl. start und end. */
export function getBlockSourceSlice(source: string, startLine1: number, endLine1: number): string {
  const lines = source.split('\n')
  const start = Math.max(0, startLine1 - 1)
  const end = Math.min(lines.length - 1, endLine1 - 1)
  if (start > end || start >= lines.length) return ''
  return lines.slice(start, end + 1).join('\n')
}

export function replaceLineRange(
  source: string,
  startLine1: number,
  endLine1: number,
  replacement: string,
): string {
  const lines = source.split('\n')
  const before = lines.slice(0, Math.max(0, startLine1 - 1))
  const after = lines.slice(Math.max(0, endLine1))
  const middle = replacement.split('\n')
  return [...before, ...middle, ...after].join('\n')
}

export function blockEditKey(startLine: number, endLine: number): string {
  return `${startLine}:${endLine}`
}

export type BlockEditSession = {
  id: string
  startLine: number
  endLine: number
  text: string
}

/** Block-Entwürfe von unten nach oben in den Quelltext einsetzen. */
export function applyBlockEditsToSource(source: string, sessions: readonly BlockEditSession[]): string {
  const sorted = [...sessions].sort((a, b) => b.startLine - a.startLine)
  let next = source
  for (const session of sorted) {
    next = replaceLineRange(next, session.startLine, session.endLine, session.text)
  }
  return next
}

export function lineCountForText(text: string): number {
  if (!text) return 1
  return text.split('\n').length
}

/** Teilt Blocktext an der Cursor-Position in zwei Absätze (mit Leerzeile dazwischen im Dokument). */
export function splitBlockTextAtCursor(blockText: string, cursor: number): [string, string] {
  const left = blockText.slice(0, cursor)
  const right = blockText.slice(cursor)
  if (blockText.includes('\n')) {
    const combined = `${left}\n\n${right}`
    const idx = combined.indexOf('\n\n')
    if (idx >= 0) {
      return [combined.slice(0, idx), combined.slice(idx + 2)]
    }
  }
  return [left.replace(/\s+$/u, ''), right.replace(/^\s+/u, '')]
}

export function sessionsAfterBlockSplit(
  source: string,
  session: BlockEditSession,
  cursor: number,
): { nextSource: string; sessions: BlockEditSession[] } {
  const [partA, partB] = splitBlockTextAtCursor(session.text, cursor)
  const middle = partA === '' && partB === '' ? '\n\n' : `${partA}\n\n${partB}`
  const nextSource = replaceLineRange(source, session.startLine, session.endLine, middle)
  const linesA = lineCountForText(partA)
  const secondStart = session.startLine + linesA + 1
  const linesB = lineCountForText(partB)
  const sessionA: BlockEditSession = {
    id: blockEditKey(session.startLine, session.startLine + linesA - 1),
    startLine: session.startLine,
    endLine: session.startLine + linesA - 1,
    text: partA,
  }
  const sessionB: BlockEditSession = {
    id: blockEditKey(secondStart, secondStart + linesB - 1),
    startLine: secondStart,
    endLine: secondStart + linesB - 1,
    text: partB,
  }
  return { nextSource, sessions: [sessionA, sessionB] }
}