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

describe('draw.io viewer embed URL', () => {
  it('nutzt chromeless Vorschau ohne Toolbar', async () => {
    const { DRAWIO_VIEWER_URL } = await import('./drawio/drawio-embed')
    expect(DRAWIO_VIEWER_URL).toContain('chrome=0')
    expect(DRAWIO_VIEWER_URL).toContain('toolbar=0')
    expect(DRAWIO_VIEWER_URL).not.toContain('nav=1')
  })
})

describe('isDrawioSource', () => {
  it('detects mxfile', () => {
    expect(isDrawioSource('<mxfile host="app.diagrams.net"></mxfile>')).toBe(true)
    expect(isDrawioSource('graph TD; A-->B')).toBe(false)
  })
})