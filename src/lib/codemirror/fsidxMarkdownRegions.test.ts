import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import {
  activeEditRegion,
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