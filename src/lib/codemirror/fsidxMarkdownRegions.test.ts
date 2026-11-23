import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import {
  activeEditRegion,
  activeRegionKey,
  findParagraphRanges,
  findTableRanges,
  isTableLine,
} from './fsidxMarkdownRegions'

describe('isTableLine', () => {
  it('erkennt GFM-Tabellenzeilen', () => {
    expect(isTableLine('| A | B |')).toBe(true)
    expect(isTableLine('|---|---|')).toBe(true)
    expect(isTableLine('Kein Tabellentext')).toBe(false)
  })
})

describe('activeEditRegion', () => {
  it('nutzt nur die aktuelle Zeile außerhalb von Tabellen', () => {
    const doc = '# Titel\n\nText\n'
    const head = doc.indexOf('Text') + 2
    const state = EditorState.create({ doc, selection: { anchor: head } })
    const active = activeEditRegion(state)
    expect(state.doc.sliceString(active.from, active.to)).toBe('Text')
  })

  it('umfasst die ganze Tabelle bei Cursor in der Tabelle', () => {
    const doc = '| H1 | H2 |\n| --- | --- |\n| a | b |\n'
    const head = doc.indexOf('| a |')
    const state = EditorState.create({ doc, selection: { anchor: head } })
    const active = activeEditRegion(state)
    expect(state.doc.sliceString(active.from, active.to)).toBe('| H1 | H2 |\n| --- | --- |\n| a | b |')
    expect(findTableRanges(state).length).toBe(1)
  })
})

describe('activeRegionKey', () => {
  it('bleibt bei Cursor-Bewegung in derselben Zeile gleich', () => {
    const doc = 'Hallo Welt'
    const state = EditorState.create({ doc, selection: { anchor: 3 } })
    const state2 = state.update({ selection: { anchor: 8 } }).state
    expect(activeRegionKey(state)).toBe('line:1')
    expect(activeRegionKey(state2)).toBe('line:1')
  })
})

describe('findParagraphRanges', () => {
  it('gruppiert Absätze an Leerzeilen', () => {
    const doc = 'Zeile A\nZeile B\n\nZeile C\n'
    const state = EditorState.create({ doc })
    const paras = findParagraphRanges(state, [])
    expect(paras.length).toBe(2)
    expect(state.doc.sliceString(paras[0].from, paras[0].to)).toBe('Zeile A\nZeile B')
    expect(state.doc.sliceString(paras[1].from, paras[1].to)).toBe('Zeile C')
  })
})