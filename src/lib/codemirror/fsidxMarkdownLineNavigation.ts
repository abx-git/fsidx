import { EditorSelection } from '@codemirror/state'
import { Prec, type EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'

function preferredColumn(state: EditorState, head: number): number {
  const line = state.doc.lineAt(head)
  return head - line.from
}

function moveToLine(view: EditorView, delta: number): boolean {
  const { state } = view
  const head = state.selection.main.head
  const line = state.doc.lineAt(head)
  const nextLineNo = line.number + delta
  if (nextLineNo < 1 || nextLineNo > state.doc.lines) return false

  const target = state.doc.line(nextLineNo)
  const col = Math.min(preferredColumn(state, head), target.length)
  const pos = target.from + col

  view.dispatch({
    selection: EditorSelection.cursor(pos),
    scrollIntoView: true,
  })
  return true
}

/** Pfeiltasten zeilenweise — nicht über atomare Vorschau-Blöcke springen. */
export const markdownLineNavigation = Prec.high(
  keymap.of([
    { key: 'ArrowUp', run: (view) => moveToLine(view, -1) },
    { key: 'ArrowDown', run: (view) => moveToLine(view, 1) },
  ]),
)