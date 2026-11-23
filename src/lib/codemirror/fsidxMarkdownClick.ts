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

export function focusPosFromPreviewClick(
  view: EditorView,
  e: MouseEvent,
  blockFrom: number,
  blockTo: number,
  previewEl: HTMLElement,
): number {
  const hit = view.posAtCoords({ x: e.clientX, y: e.clientY }, false)
  if (hit >= blockFrom && hit <= blockTo) {
    return hit
  }
  return blockClickToLineStart(
    view.state,
    blockFrom,
    blockTo,
    e.clientY,
    previewEl.getBoundingClientRect(),
  )
}

export function dispatchSelection(view: EditorView, anchor: number) {
  const head = Math.min(Math.max(anchor, 0), view.state.doc.length)
  view.dispatch({
    selection: { anchor: head },
    scrollIntoView: false,
  })
  view.focus()
}