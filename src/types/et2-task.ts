import type { Et2TaskStatus } from './et2-tasks-bundle'

export const ET2_TASK_FORMAT = 'et2-task-v1' as const

export type Et2TaskKind = 'card' | 'note' | 'symbol'

export interface Et2TaskFrontmatter {
  format: typeof ET2_TASK_FORMAT
  version: 1
  id: string
  kind?: Et2TaskKind
  title: string
  tags?: string[]
  link?: string
  command?: string
  dueDate?: string | null
  reminderDate?: string | null
  effort?: number
  effortUnit?: 'hours' | 'minutes' | 'workdays'
  et2?: {
    legacyId?: string
    migratedAt?: string
    canvas?: {
      x?: number
      y?: number
      width?: number
      height?: number
      zIndex?: number
    }
  }
}

export interface Et2TaskDocument {
  frontmatter: Et2TaskFrontmatter
  body: string
}

export interface Et2TaskSummary {
  relativePath: string
  taskId: string
  title: string
  kind?: Et2TaskKind
  body?: string
  dueDate?: string | null
  reminderDate?: string | null
  link?: string
  command?: string
  effort?: number
  effortUnit?: 'hours' | 'minutes' | 'workdays'
  tags?: string[]
  status?: Et2TaskStatus
  parentId?: string | null
  depth?: number
  bundlePath?: string
  /** Pfad des Ordners relativ zum aktuellen Scope (z. B. `B` oder `.`). */
  folderWithinScope?: string
}