import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { lineStartFromBlockClick } from './fsidxMarkdownClick'

describe('lineStartFromBlockClick', () => {
  it('wählt die vertikal angeklickte Zeile im Block', () => {
    const doc = 'a\nb\nc\n'
    const state = EditorState.create({ doc })
    const from = 0
    const to = state.doc.line(3).to
    const rect = { top: 0, height: 60, left: 0, width: 100 } as DOMRect
    const mid = lineStartFromBlockClick(state, from, to, 35, rect)
    expect(state.doc.lineAt(mid).number).toBe(2)
  })
})