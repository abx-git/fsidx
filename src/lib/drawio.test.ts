import { describe, expect, it } from 'vitest'
import { isDrawioPath, isDrawioSource } from './drawio'

describe('isDrawioPath', () => {
  it('matches common extensions', () => {
    expect(isDrawioPath('schema.drawio')).toBe(true)
    expect(isDrawioPath('a.dio')).toBe(true)
    expect(isDrawioPath('flow.drawio.xml')).toBe(true)
    expect(isDrawioPath('note.xml')).toBe(false)
  })
})

describe('isDrawioSource', () => {
  it('detects mxfile', () => {
    expect(isDrawioSource('<mxfile host="app.diagrams.net"></mxfile>')).toBe(true)
    expect(isDrawioSource('graph TD; A-->B')).toBe(false)
  })
})