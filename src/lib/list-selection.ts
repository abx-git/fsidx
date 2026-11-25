/** Bereichsauswahl in einer sichtbaren Listenreihenfolge (Umschalt+Klick). */
export function rangeSelectIds(
  orderedIds: readonly string[],
  anchorId: string,
  targetId: string,
): Set<string> {
  const a = orderedIds.indexOf(anchorId)
  const b = orderedIds.indexOf(targetId)
  if (a < 0 || b < 0) return new Set([targetId])
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return new Set(orderedIds.slice(lo, hi + 1))
}