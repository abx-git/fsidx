import type { Et2TaskStatus } from '../../types/et2-tasks-bundle'

export const ET2_TASK_STATUS_OPTIONS: { value: Et2TaskStatus; label: string }[] = [
  { value: 'open', label: 'Offen' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'done', label: 'Erledigt' },
  { value: 'cancelled', label: 'Abgebrochen' },
]

export function et2TaskStatusLabel(status: Et2TaskStatus | undefined): string {
  const found = ET2_TASK_STATUS_OPTIONS.find((o) => o.value === status)
  return found?.label ?? 'Offen'
}