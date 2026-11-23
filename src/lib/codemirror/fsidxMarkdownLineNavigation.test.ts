import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'

describe('markdown line navigation', () => {
  it('kann jede Dokumentzeile per Zeilennummer ansteuern', () => {
    const doc = 'a\nb\nc\n'
    const state = EditorState.create({ doc, selection: { anchor: 0 } })
    expect(state.doc.lineAt(0).number).toBe(1)
    const line3 = state.doc.line(3)
    const state2 = state.update({ selection: { anchor: line3.from } }).state
    expect(state.doc.lineAt(state2.selection.main.head).number).toBe(3)
  })
})