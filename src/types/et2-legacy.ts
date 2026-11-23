/** Subset von ET2 `hierarchical-task-manager` (abx-git/ET2). */

export const ET2_EXPORT_FORMAT = 'hierarchical-task-manager' as const

export type Et2TreeNodeKind = 'card' | 'note' | 'symbol'

export type Et2RelationType =
  | 'untyped'
  | 'precedes'
  | 'requires'
  | 'blocks'
  | 'informs'
  | 'assigns'
  | 'supports'

export interface Et2TaskRelation {
  id: string
  sourceId: string
  targetId: string
  type: Et2RelationType
  label?: string
}

export interface Et2TaskNodeJson {
  id: string
  kind?: Et2TreeNodeKind
  title: string
  markdown?: string
  link?: string
  command?: string
  description?: string
  tags?: string[]
  dueDate?: string | null
  reminderDate?: string | null
  effort?: number
  effortUnit?: 'hours' | 'minutes' | 'workdays'
  effortSource?: 'manual' | 'calculated'
  x?: number
  y?: number
  width?: number
  height?: number
  zIndex?: number
  children: Et2TaskNodeJson[]
}

export interface Et2BoardSnapshotV1 {
  format: typeof ET2_EXPORT_FORMAT
  version: number
  exportedAt?: string
  scope: 'board'
  roots: Et2TaskNodeJson[]
  relations?: Et2TaskRelation[]
}

export function isEt2BoardSnapshot(value: unknown): value is Et2BoardSnapshotV1 {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    o.format === ET2_EXPORT_FORMAT &&
    o.scope === 'board' &&
    Array.isArray(o.roots)
  )
}