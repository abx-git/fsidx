export function normalizeTaskCommand(raw: string): string {
  return raw.replace(/\r\n/g, '\n').trim()
}

export function getTaskCommand(raw: string | undefined | null): string | null {
  const n = normalizeTaskCommand(raw ?? '')
  return n || null
}