export function sanitizePathSegment(title: string, fallbackId: string): string {
  const base = title
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
  const safe = base || fallbackId
  return safe.replace(/\.+$/g, '') || fallbackId
}