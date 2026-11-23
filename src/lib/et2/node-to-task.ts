import type { Et2TaskNodeJson } from '../../types/et2-legacy'
import type { Et2TaskDocument } from '../../types/et2-task'
import { ET2_TASK_FORMAT } from '../../types/et2-task'

export function et2NodeToTaskDocument(node: Et2TaskNodeJson, migratedAt: string): Et2TaskDocument {
  const kind = node.kind ?? 'card'
  const body =
  kind === 'note'
    ? (node.markdown ?? '')
    : (node.description ?? node.markdown ?? '')

  const frontmatter: Et2TaskDocument['frontmatter'] = {
    format: ET2_TASK_FORMAT,
    version: 1,
    id: node.id,
    kind,
    title: node.title,
    tags: node.tags,
    link: node.link,
    command: node.command,
    dueDate: node.dueDate,
    reminderDate: node.reminderDate,
    effort: node.effort,
    effortUnit: node.effortUnit,
    et2: {
      legacyId: node.id,
      migratedAt,
      canvas:
        node.x !== undefined ||
        node.y !== undefined ||
        node.width !== undefined ||
        node.height !== undefined ||
        node.zIndex !== undefined
          ? {
              x: node.x,
              y: node.y,
              width: node.width,
              height: node.height,
              zIndex: node.zIndex,
            }
          : undefined,
    },
  }

  return { frontmatter, body }
}