import type { Et2TaskKind } from './et2-task'

export const ET2_TASKS_BUNDLE_FORMAT = 'et2-tasks-v1' as const

/** Status einer Aufgabe (in `tasks.json` / `.tsk.json`). */
export type Et2TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled'

export type Et2EffortUnit = 'hours' | 'minutes' | 'workdays'

export interface Et2TaskRecord {
  id: string
  parentId?: string | null
  title: string
  body?: string
  status: Et2TaskStatus
  kind?: Et2TaskKind
  order?: number
  tags?: string[]
  dueDate?: string | null
  reminderDate?: string | null
  link?: string
  command?: string
  effort?: number
  effortUnit?: Et2EffortUnit
}

/** Felder, die im Detail-Editor geändert und gespeichert werden. */
export type Et2TaskEditableFields = Pick<
  Et2TaskRecord,
  | 'title'
  | 'body'
  | 'status'
  | 'parentId'
  | 'kind'
  | 'tags'
  | 'dueDate'
  | 'reminderDate'
  | 'link'
  | 'command'
  | 'effort'
  | 'effortUnit'
  | 'order'
>

export interface Et2TasksBundle {
  format: typeof ET2_TASKS_BUNDLE_FORMAT
  version: 1
  tasks: Et2TaskRecord[]
}