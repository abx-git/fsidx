import { describe, expect, it } from 'vitest'
import { mapRenderedOffsetToSource } from './markdown-caret'

describe('mapRenderedOffsetToSource', () => {
  it('mappt einfachen Text', () => {
    expect(mapRenderedOffsetToSource('Hallo Welt', 5)).toBe(5)
  })

  it('überspringt Heading-Marker', () => {
    expect(mapRenderedOffsetToSource('# Titel', 3)).toBeGreaterThanOrEqual(2)
  })
})