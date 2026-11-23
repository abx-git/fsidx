import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { blockClickToLineStart } from './fsidxMarkdownClick'

describe('blockClickToLineStart', () => {
  it('wählt die angeklickte Zeile im Block', () => {
    const doc = 'A\nB\nC\n'
    const state = EditorState.create({ doc })
    const blockFrom = 0
    const blockTo = state.doc.line(3).to
    const rect = { top: 0, height: 60, width: 100, left: 0, right: 0, bottom: 60, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    const posMid = blockClickToLineStart(state, blockFrom, blockTo, 35, rect)
    expect(state.doc.sliceString(posMid, posMid + 1)).toBe('B')
  })
})