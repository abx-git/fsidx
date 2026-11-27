/** Mindestbreite der mittleren Spalte (Dateiliste / Vorschau). */
export const MIN_MAIN_CENTER_PX = 320

export function clampSidebarWidthForGrid(options: {
  sidebarWidthPx: number
  sidebarMinWidth: number
  maxAllowed: number
  viewportWidth: number
  treeWidthPx: number
  treeCollapsed: boolean
  minCenterPx?: number
}): number {
  const minCenter = options.minCenterPx ?? MIN_MAIN_CENTER_PX
  const tree = options.treeCollapsed ? 0 : options.treeWidthPx
  const capByViewport = Math.max(
    options.sidebarMinWidth,
    options.viewportWidth - tree - minCenter,
  )
  const cap = Math.min(options.maxAllowed, capByViewport)
  return Math.min(cap, Math.max(options.sidebarMinWidth, Math.round(options.sidebarWidthPx)))
}