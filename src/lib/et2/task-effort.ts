import type { Et2EffortUnit } from '../../types/et2-tasks-bundle'

export const EFFORT_UNITS: Et2EffortUnit[] = ['hours', 'minutes', 'workdays']

export const DEFAULT_EFFORT_UNIT: Et2EffortUnit = 'hours'

export const EFFORT_UNIT_LABELS: Record<Et2EffortUnit, string> = {
  hours: 'Stunden',
  minutes: 'Minuten',
  workdays: 'Werktage',
}

export function getEffortUnit(unit: Et2EffortUnit | undefined): Et2EffortUnit {
  return unit && EFFORT_UNITS.includes(unit) ? unit : DEFAULT_EFFORT_UNIT
}

export function formatEffortValue(effort: number, unit: Et2EffortUnit): string {
  if (effort <= 0) return ''
  switch (unit) {
    case 'hours': {
      const rounded = Math.round(effort * 10) / 10
      return `${Number.isInteger(rounded) ? rounded : rounded.toString().replace('.', ',')}h`
    }
    case 'minutes': {
      if (effort >= 60) {
        const h = Math.floor(effort / 60)
        const m = Math.round(effort % 60)
        return m > 0 ? `${h}h ${m}min` : `${h}h`
      }
      return `${Math.round(effort)}min`
    }
    case 'workdays': {
      const n = Math.round(effort * 10) / 10
      const label = n === 1 ? 'Werktag' : 'Werktage'
      return `${Number.isInteger(n) ? n : n.toString().replace('.', ',')} ${label}`
    }
  }
}

export function formatEffortDisplay(
  effort: number | undefined,
  unit: Et2EffortUnit | undefined,
): string {
  if (effort === undefined || effort <= 0) return ''
  return formatEffortValue(effort, getEffortUnit(unit))
}