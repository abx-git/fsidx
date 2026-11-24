import { afterEach, describe, expect, it, vi } from 'vitest'
import { fitContextMenuToViewport } from './context-menu-position'

describe('fitContextMenuToViewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('klappt nach oben, wenn unten nicht genug Platz', () => {
    vi.stubGlobal('window', { innerWidth: 1200, innerHeight: 800 })
    const { left, top } = fitContextMenuToViewport(100, 750, 260, 400, 8)
    expect(left).toBe(100)
    expect(top).toBe(750 - 400)
  })

  it('klemmt horizontal am rechten Rand', () => {
    vi.stubGlobal('window', { innerWidth: 1000, innerHeight: 800 })
    const { left } = fitContextMenuToViewport(900, 100, 260, 200, 8)
    expect(left).toBeLessThan(900)
    expect(left).toBeGreaterThanOrEqual(8)
  })
})