/** Anzeige-Titel statt Datei-ID oder Hex-Strings aus dem Index. */

export function looksLikeOpaqueId(value: string): boolean {
  const v = value.trim()
  if (!v) return true
  if (/^[a-f0-9]{8,}$/i.test(v)) return true
  if (/^t[a-z0-9]{6,}$/i.test(v)) return true
  if (/\.task\.md$/i.test(v)) return true
  return false
}

function stripListOrHeadingMarkup(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s?/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .trim()
}

export function firstMeaningfulLine(body: string): string | null {
  for (const line of body.split('\n')) {
    const t = stripListOrHeadingMarkup(line)
    if (!t || t === '…' || t === '...') continue
    if (looksLikeOpaqueId(t)) continue
    return t.length > 100 ? `${t.slice(0, 97)}…` : t
  }
  return null
}

export function humanTaskTitle(title: string, body: string, taskId: string): string {
  const t = title.trim()
  if (t && !looksLikeOpaqueId(t) && t !== taskId) return t
  const fromBody = firstMeaningfulLine(body)
  if (fromBody) return fromBody
  return 'Unbenannte Aufgabe'
}

/** Letzter Ordner-Segmentname für die Aufgabenliste. */
export function formatTaskFolderLabel(folderWithinScope?: string): string | null {
  if (!folderWithinScope || folderWithinScope === '.') return null
  const parts = folderWithinScope.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? null
}