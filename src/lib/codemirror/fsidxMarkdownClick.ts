import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

/** Vertikaler Klick in Vorschau-Block → Zeilenanfang in der Quelle. */
export function blockClickToLineStart(
  state: EditorState,
  blockFrom: number,
  blockTo: number,
  clientY: number,
  rect: DOMRect,
): number {
  const first = state.doc.lineAt(blockFrom).number
  const last = state.doc.lineAt(blockTo).number
  const count = Math.max(1, last - first + 1)
  const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(rect.height, 1)))
  const lineNo = first + Math.min(count - 1, Math.floor(ratio * count))
  return state.doc.line(lineNo).from
}

export function columnFromClickX(
  state: EditorState,
  lineFrom: number,
  clientX: number,
  rect: DOMRect,
): number {
  const line = state.doc.lineAt(lineFrom)
  const text = state.sliceDoc(line.from, line.to)
  if (!text.length) return line.from
  const xRatio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(rect.width, 1)))
  const col = Math.min(text.length, Math.round(xRatio * text.length))
  return line.from + col
}

/** In Vorschau-Widgets nicht posAtCoords verwenden (springt oft an Blockanfang). */
export function focusPosFromPreviewClick(
  view: EditorView,
  e: MouseEvent,
  blockFrom: number,
  blockTo: number,
  previewEl: HTMLElement,
): number {
  const rect = previewEl.getBoundingClientRect()
  const lineStart = blockClickToLineStart(
    view.state,
    blockFrom,
    blockTo,
    e.clientY,
    rect,
  )
  return columnFromClickX(view.state, lineStart, e.clientX, rect)
}

export function dispatchSelection(view: EditorView, anchor: number) {
  const head = Math.min(Math.max(anchor, 0), view.state.doc.length)
  view.dispatch({
    selection: { anchor: head },
    scrollIntoView: false,
  })
  view.focus()
}