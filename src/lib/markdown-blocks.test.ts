import { describe, expect, it } from 'vitest'
import { joinMarkdownBlocks, replaceMarkdownBlock, splitMarkdownBlocks } from './markdown-blocks'

describe('splitMarkdownBlocks', () => {
  it('trennt Absätze an Leerzeilen', () => {
    expect(splitMarkdownBlocks('A\n\nB')).toEqual(['A', 'B'])
  })

  it('hält Codeblöcke zusammen', () => {
    const md = 'Intro\n\n```js\na\n\nb\n```\n\nAfter'
    expect(splitMarkdownBlocks(md)).toEqual(['Intro', '```js\na\n\nb\n```', 'After'])
  })
})

describe('replaceMarkdownBlock', () => {
  it('ersetzt einen Block', () => {
    const blocks = splitMarkdownBlocks('A\n\nB')
    expect(replaceMarkdownBlock(blocks, 1, 'C')).toBe('A\n\nC')
    expect(joinMarkdownBlocks(blocks)).toBe('A\n\nB')
  })
})