/** Menü-Position so anpassen, dass es im Viewport bleibt (nach oben klappen am unteren Rand). */
export function fitContextMenuToViewport(
  anchorX: number,
  anchorY: number,
  menuWidth: number,
  menuHeight: number,
  margin = 8,
): { left: number; top: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : menuWidth + anchorX + margin
  const vh = typeof window !== 'undefined' ? window.innerHeight : menuHeight + anchorY + margin

  let left = anchorX
  let top = anchorY

  if (left + menuWidth > vw - margin) {
    left = Math.max(margin, vw - menuWidth - margin)
  }
  if (left < margin) left = margin

  if (top + menuHeight > vh - margin) {
    top = Math.max(margin, anchorY - menuHeight)
  }
  if (top < margin) top = margin

  return { left, top }
}