import { describe, expect, it } from 'vitest'
import {
  applyBlockEditsToSource,
  blockSourceIsInlineEditable,
  getBlockSourceSlice,
  isDiagramFenceBlockText,
  replaceLineRange,
  sessionsAfterBlockSplit,
  splitBlockTextAtCursor,
} from './markdown-block-edit'

describe('markdown-block-edit', () => {
  it('ersetzt Zeilenbereich', () => {
    const src = 'a\nb\nc'
    expect(replaceLineRange(src, 2, 2, 'B')).toBe('a\nB\nc')
  })

  it('liest und setzt Block-Slice', () => {
    const src = '# T\n\nAbsatz eins.\n\nZweiter.'
    expect(getBlockSourceSlice(src, 3, 3)).toBe('Absatz eins.')
    const sessions = [{ id: '3:3', startLine: 3, endLine: 3, text: 'Neu.' }]
    expect(applyBlockEditsToSource(src, sessions)).toBe('# T\n\nNeu.\n\nZweiter.')
  })

  it('teilt einzeiligen Block an Cursor', () => {
    expect(splitBlockTextAtCursor('Hallo Welt', 6)).toEqual(['Hallo', 'Welt'])
  })

  it('erkennt Diagramm-Fences', () => {
    const mermaid = '```mermaid\nflowchart LR\n  A --> B\n```'
    expect(isDiagramFenceBlockText(mermaid)).toBe(true)
    const src = `Vor\n${mermaid}\nNach`
    expect(blockSourceIsInlineEditable(src, 2, 5)).toBe(false)
    expect(blockSourceIsInlineEditable(`Vor\n\`\`\`ts\nx()\n\`\`\`\nNach`, 2, 4)).toBe(true)
  })

  it('erzeugt zwei Sessions nach Split', () => {
    const src = '## T\n\nHallo Welt\n\nEnde'
    const session = { id: '3:3', startLine: 3, endLine: 3, text: 'Hallo Welt' }
    const { nextSource, sessions } = sessionsAfterBlockSplit(src, session, 6)
    expect(nextSource).toBe('## T\n\nHallo\n\nWelt\n\nEnde')
    expect(sessions).toHaveLength(2)
    expect(sessions[0]!.text).toBe('Hallo')
    expect(sessions[1]!.text).toBe('Welt')
    expect(sessions[1]!.startLine).toBeGreaterThan(sessions[0]!.endLine)
  })
})