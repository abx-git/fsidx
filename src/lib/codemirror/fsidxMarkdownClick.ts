import { EditorSelection, type EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

/** Vertikaler Klick in Vorschau → Zeilenanfang in diesem Dokumentbereich. */
export function lineStartFromBlockClick(
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

function caretAtClick(
  view: EditorView,
  x: number,
  y: number,
  from: number,
  to: number,
): boolean {
  const hit = view.posAndSideAtCoords({ x, y }, false)
  if (hit.pos >= from && hit.pos <= to) {
    view.dispatch({
      selection: EditorSelection.cursor(hit.pos, hit.assoc),
      scrollIntoView: false,
    })
    return true
  }
  const pos = view.posAtCoords({ x, y }, false)
  if (pos >= from && pos <= to) {
    view.dispatch({
      selection: EditorSelection.cursor(pos),
      scrollIntoView: false,
    })
    return true
  }
  return false
}

export function activateFromPreviewClick(
  view: EditorView,
  e: MouseEvent,
  blockFrom: number,
  blockTo: number,
  previewEl: HTMLElement,
) {
  const x = e.clientX
  const y = e.clientY
  const lineFrom = lineStartFromBlockClick(
    view.state,
    blockFrom,
    blockTo,
    y,
    previewEl.getBoundingClientRect(),
  )
  const line = view.state.doc.lineAt(lineFrom)
  const head = view.state.selection.main.head
  const onTargetLine = head >= line.from && head <= line.to

  if (!onTargetLine) {
    view.dispatch({
      selection: EditorSelection.cursor(lineFrom),
      scrollIntoView: false,
    })
  }

  view.focus()

  const attempt = (left: number) => {
    if (caretAtClick(view, x, y, line.from, line.to)) return
    if (left > 0) requestAnimationFrame(() => attempt(left - 1))
  }
  requestAnimationFrame(() => attempt(4))
}