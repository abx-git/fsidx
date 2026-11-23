import { ET2_TASK_FORMAT } from '../../types/et2-task'
import type { Et2TaskDocument, Et2TaskFrontmatter } from '../../types/et2-task'
import { parseYamlFrontmatter } from './parse-yaml-frontmatter'

function asFrontmatter(data: Record<string, unknown>, fallbackId: string): Et2TaskFrontmatter {
  const id = typeof data.id === 'string' ? data.id : fallbackId
  const title = typeof data.title === 'string' ? data.title : id
  return {
    format: ET2_TASK_FORMAT,
    version: 1,
    id,
    title,
    kind: data.kind === 'card' || data.kind === 'note' || data.kind === 'symbol' ? data.kind : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    link: typeof data.link === 'string' ? data.link : undefined,
    command: typeof data.command === 'string' ? data.command : undefined,
    dueDate: data.dueDate === null || typeof data.dueDate === 'string' ? (data.dueDate as string | null) : undefined,
    reminderDate:
      data.reminderDate === null || typeof data.reminderDate === 'string'
        ? (data.reminderDate as string | null)
        : undefined,
    effort: typeof data.effort === 'number' ? data.effort : undefined,
    effortUnit:
      data.effortUnit === 'hours' || data.effortUnit === 'minutes' || data.effortUnit === 'workdays'
        ? data.effortUnit
        : undefined,
    et2: data.et2 && typeof data.et2 === 'object' ? (data.et2 as Et2TaskFrontmatter['et2']) : undefined,
  }
}

export function parseTaskMd(text: string, fallbackTaskId: string): Et2TaskDocument {
  const { data, body } = parseYamlFrontmatter(text)
  return {
    frontmatter: asFrontmatter(data, fallbackTaskId),
    body,
  }
}