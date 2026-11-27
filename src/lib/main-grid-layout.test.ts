import { describe, expect, it } from 'vitest'
import { clampSidebarWidthForGrid } from './main-grid-layout'

describe('clampSidebarWidthForGrid', () => {
  it('behält schmale Leiste bei', () => {
    expect(
      clampSidebarWidthForGrid({
        sidebarWidthPx: 380,
        sidebarMinWidth: 280,
        maxAllowed: 960,
        viewportWidth: 1400,
        treeWidthPx: 240,
        treeCollapsed: false,
      }),
    ).toBe(380)
  })

  it('begrenzt auf verfügbaren Platz neben Baum und Mitte', () => {
    expect(
      clampSidebarWidthForGrid({
        sidebarWidthPx: 1800,
        sidebarMinWidth: 280,
        maxAllowed: 2400,
        viewportWidth: 1200,
        treeWidthPx: 240,
        treeCollapsed: false,
      }),
    ).toBe(640)
  })

  it('berücksichtigt eingeklappten Baum', () => {
    expect(
      clampSidebarWidthForGrid({
        sidebarWidthPx: 1200,
        sidebarMinWidth: 280,
        maxAllowed: 2400,
        viewportWidth: 1000,
        treeWidthPx: 400,
        treeCollapsed: true,
      }),
    ).toBe(680)
  })
})