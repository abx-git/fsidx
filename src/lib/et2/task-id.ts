export function formatTaskIdForDisplay(id: string): string {
  const t = id.trim()
  if (t.length <= 13) return t
  return `${t.slice(0, 8)}…`
}