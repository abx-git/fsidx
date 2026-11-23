import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { blockClickToLineStart, columnFromClickX } from './fsidxMarkdownClick'

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

describe('columnFromClickX', () => {
  it('schätzt Spalte aus horizontaler Klickposition', () => {
    const doc = '0123456789'
    const state = EditorState.create({ doc })
    const rect = { left: 0, width: 100, top: 0, height: 16 } as DOMRect
    const pos = columnFromClickX(state, 0, 50, rect)
    expect(pos).toBeGreaterThan(2)
    expect(pos).toBeLessThan(8)
  })
})