import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

function caretAtClick(view: EditorView, x: number, y: number, from: number, to: number): boolean {
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

/** Vorschau-Zeile aktivieren, dann Marke exakt an Mausposition (nach Neuzeichnen). */
export function activateFromPreviewClick(
  view: EditorView,
  e: MouseEvent,
  rangeFrom: number,
  rangeTo: number,
) {
  const x = e.clientX
  const y = e.clientY
  const safeTo = Math.min(rangeTo, view.state.doc.length)
  const head = view.state.selection.main.head
  const onTargetLine = head >= rangeFrom && head <= safeTo

  if (!onTargetLine) {
    view.dispatch({
      selection: EditorSelection.cursor(Math.max(0, rangeFrom)),
      scrollIntoView: false,
    })
  }

  view.focus()

  const attempt = (left: number) => {
    if (caretAtClick(view, x, y, rangeFrom, safeTo)) return
    if (left > 0) requestAnimationFrame(() => attempt(left - 1))
  }
  requestAnimationFrame(() => attempt(4))
}