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
  dueDate?: string | null
  tags?: string[]
}