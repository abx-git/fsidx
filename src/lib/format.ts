export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exp
  return `${value.toFixed(value >= 10 || exp === 0 ? 0 : 1)} ${units[exp]}`
}

export function formatDate(ms: number | undefined): string {
  if (ms == null) return '—'
  return new Date(ms).toLocaleString()
}