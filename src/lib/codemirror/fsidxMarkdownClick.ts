import type { EditorView } from '@codemirror/view'

/**
 * Vorschau-Klick: zuerst Zeile aktivieren, nach Neuzeichnen präzise Position per posAtCoords.
 */
export function activateFromPreviewClick(
  view: EditorView,
  e: MouseEvent,
  rangeFrom: number,
  rangeTo: number,
) {
  const safeTo = Math.min(rangeTo, view.state.doc.length)
  view.dispatch({
    selection: { anchor: Math.max(0, rangeFrom) },
    scrollIntoView: false,
  })
  view.focus()

  const x = e.clientX
  const y = e.clientY
  requestAnimationFrame(() => {
    const precise = view.posAtCoords({ x, y })
    if (precise != null && precise >= rangeFrom && precise <= safeTo) {
      view.dispatch({
        selection: { anchor: precise },
        scrollIntoView: false,
      })
      view.focus()
      return
    }
    const estimated = view.posAtCoords({ x, y }, false)
    if (estimated >= rangeFrom && estimated <= safeTo) {
      view.dispatch({
        selection: { anchor: estimated },
        scrollIntoView: false,
      })
      view.focus()
    }
  })
}

export function dispatchSelection(view: EditorView, anchor: number) {
  const head = Math.min(Math.max(anchor, 0), view.state.doc.length)
  view.dispatch({
    selection: { anchor: head },
    scrollIntoView: false,
  })
  view.focus()
}