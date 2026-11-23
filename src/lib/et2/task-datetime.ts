/**
 * Fälligkeit / Erinnerung (portiert aus ET2).
 */

export function isDateOnlyDue(d: Date): boolean {
  const s = d.getSeconds()
  const ms = d.getMilliseconds()
  if (s !== 0 || ms !== 0) return false
  const h = d.getHours()
  const m = d.getMinutes()
  return (h === 0 && m === 0) || (h === 12 && m === 0)
}

export function toInputDateTimeLocal(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  if (isDateOnlyDue(d)) {
    return `${y}-${mo}-${day}T00:00`
  }
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${day}T${h}:${min}`
}

export function fromInputDateTimeLocal(s: string): Date | null {
  const t = s.trim()
  if (!t) return null
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const da = Number(m[3])
  const hh = Number(m[4])
  const min = Number(m[5])
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(da) ||
    !Number.isFinite(hh) ||
    !Number.isFinite(min)
  ) {
    return null
  }
  return new Date(y, mo - 1, da, hh, min, 0, 0)
}

export function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function toIsoDateString(d: Date | null): string | null {
  if (!d) return null
  return d.toISOString()
}

export function toInputDateTimeLocalFromIso(iso: string | null | undefined): string {
  return toInputDateTimeLocal(parseIsoDate(iso))
}

export function startOfLocalDay(d: Date = new Date()): Date {
  const x = new Date(d.getTime())
  x.setHours(0, 0, 0, 0)
  return x
}

export function formatDueHint(d: Date | null): string | null {
  if (!d) return null
  if (isDateOnlyDue(d)) {
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isDueOverdue(dueDate: Date | null, done: boolean): boolean {
  if (!dueDate || done) return false
  if (isDateOnlyDue(dueDate)) {
    return dueDate.getTime() < startOfLocalDay().getTime()
  }
  return dueDate.getTime() < Date.now()
}