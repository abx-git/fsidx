import { describe, expect, it } from 'vitest'
import { HEAVY_PREVIEW_WARN_BYTES, shouldConfirmHeavyPreview } from './heavy-preview'

describe('shouldConfirmHeavyPreview', () => {
  it('warnt bei großen Tabellen', () => {
    expect(shouldConfirmHeavyPreview('spreadsheet', HEAVY_PREVIEW_WARN_BYTES)).toBe(true)
    expect(shouldConfirmHeavyPreview('spreadsheet', HEAVY_PREVIEW_WARN_BYTES - 1)).toBe(false)
  })

  it('ignoriert leichte Viewer', () => {
    expect(shouldConfirmHeavyPreview('markdown', HEAVY_PREVIEW_WARN_BYTES)).toBe(false)
  })

  it('ohne Größe keine Warnung', () => {
    expect(shouldConfirmHeavyPreview('spreadsheet', undefined)).toBe(false)
  })
})