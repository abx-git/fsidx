import { describe, expect, it } from 'vitest'
import { fromInputDateTimeLocal, parseIsoDate, toIsoDateString } from './task-datetime'

describe('task-datetime', () => {
  it('roundtrips datetime-local', () => {
    const d = fromInputDateTimeLocal('2026-03-15T14:30')
    expect(d).not.toBeNull()
    const iso = toIsoDateString(d)
    expect(parseIsoDate(iso)?.getHours()).toBe(14)
  })

  it('empty input → null', () => {
    expect(fromInputDateTimeLocal('')).toBeNull()
    expect(toIsoDateString(null)).toBeNull()
  })
})